package ir.bustracking.driver.gpsplugin;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Capacitor bridge for the foreground-service-owned tracking implementation. */
@CapacitorPlugin(
    name = "GPSPlugin",
    permissions = {
        @Permission(
            alias = "location",
            strings = {Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}
        ),
        @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
    }
)
public class GPSPlugin extends Plugin {

    private static final String PREFS_NAME = "gps_tracking_service";
    private static final String PREF_SERVICE_RUNNING = "service_running";
    private static final String PREF_TRACKING_ACTIVE = "tracking_active";

    private GPSDatabaseHelper dbHelper;
    private ExecutorService executorService;
    private final AtomicBoolean flushInProgress = new AtomicBoolean(false);
    private BroadcastReceiver serviceReceiver;

    @Override
    public void load() {
        super.load();
        dbHelper = new GPSDatabaseHelper(getContext().getApplicationContext());
        executorService = Executors.newSingleThreadExecutor();
        registerServiceReceiver();
    }

    @Override
    protected void handleOnDestroy() {
        if (serviceReceiver != null) {
            getContext().unregisterReceiver(serviceReceiver);
        }
        if (executorService != null) executorService.shutdown();
        if (dbHelper != null) dbHelper.close();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            call.resolve(permissionPayload());
            return;
        }
        requestPermissionForAlias("location", call, "locationPermissionCallback");
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        call.resolve(permissionPayload());
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState("notifications") == PermissionState.GRANTED) {
            call.resolve(permissionPayload());
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        call.resolve(permissionPayload());
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        call.resolve(permissionPayload());
    }

    @PluginMethod
    public void checkGPSStatus(PluginCall call) {
        call.resolve(new JSObject().put("enabled", isLocationEnabled()));
    }

    @PluginMethod
    public void getTrackingStatus(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        JSObject result = new JSObject();
        result.put("running", prefs.getBoolean(PREF_SERVICE_RUNNING, false));
        result.put("tracking", prefs.getBoolean(PREF_TRACKING_ACTIVE, false));
        result.put("gpsEnabled", isLocationEnabled());
        result.put("permissionsGranted", hasLocationPermission());
        call.resolve(result);
    }

    @PluginMethod
    public void startForegroundService(PluginCall call) {
        if (!hasLocationPermission()) {
            call.reject("Location permission is required before starting the foreground service", "LOCATION_PERMISSION_DENIED");
            return;
        }
        Intent intent = new Intent(getContext(), GPSForegroundService.class)
            .setAction(GPSForegroundService.ACTION_START_FOREGROUND)
            .putExtra(GPSForegroundService.EXTRA_NOTIFICATION_TITLE, call.getString("notificationTitle", "GPS Tracking Active"))
            .putExtra(GPSForegroundService.EXTRA_NOTIFICATION_TEXT, call.getString("notificationText", "Bus location is being tracked"));
        try {
            ContextCompat.startForegroundService(getContext(), intent);
            call.resolve();
        } catch (SecurityException exception) {
            call.reject("Android denied foreground-service start: " + exception.getMessage(), "FOREGROUND_SERVICE_DENIED", exception);
        }
    }

    @PluginMethod
    public void stopForegroundService(PluginCall call) {
        Intent intent = new Intent(getContext(), GPSForegroundService.class).setAction(GPSForegroundService.ACTION_STOP_SERVICE);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void isServiceRunning(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        call.resolve(new JSObject().put("running", prefs.getBoolean(PREF_SERVICE_RUNNING, false)));
    }

    @PluginMethod
    public void startLocationUpdates(PluginCall call) {
        String tripId = call.getString("tripId");
        if (tripId == null || tripId.trim().isEmpty()) {
            call.reject("tripId is required", "INVALID_TRIP");
            return;
        }
        if (!hasLocationPermission()) {
            call.reject("Location permission is not granted", "LOCATION_PERMISSION_DENIED");
            return;
        }
        if (!isLocationEnabled()) {
            call.reject("Location services are disabled", "GPS_DISABLED");
            return;
        }

        Intent intent = new Intent(getContext(), GPSForegroundService.class)
            .setAction(GPSForegroundService.ACTION_START_TRACKING)
            .putExtra(GPSForegroundService.EXTRA_TRIP_ID, tripId)
            .putExtra(GPSForegroundService.EXTRA_INTERVAL_MS, Math.max(1_000L, call.getLong("intervalMs", 5_000L)))
            .putExtra(GPSForegroundService.EXTRA_FASTEST_INTERVAL_MS, Math.max(1_000L, call.getLong("fastestIntervalMs", 2_000L)))
            .putExtra(GPSForegroundService.EXTRA_PRIORITY, call.getString("priority", "HIGH_ACCURACY"));
        ContextCompat.startForegroundService(getContext(), intent);
        call.resolve();
    }

    @PluginMethod
    public void stopLocationUpdates(PluginCall call) {
        Intent intent = new Intent(getContext(), GPSForegroundService.class).setAction(GPSForegroundService.ACTION_STOP_TRACKING);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void getQueueSize(PluginCall call) {
        String tripId = call.getString("tripId");
        if (tripId == null || tripId.isEmpty()) {
            call.reject("tripId is required", "INVALID_TRIP");
            return;
        }
        call.resolve(new JSObject().put("size", dbHelper.getQueueSize(tripId)));
    }

    @PluginMethod
    public void getQueueStats(PluginCall call) {
        String tripId = call.getString("tripId");
        if (tripId == null || tripId.isEmpty()) {
            call.reject("tripId is required", "INVALID_TRIP");
            return;
        }
        JSObject result = new JSObject();
        result.put("total", dbHelper.getTotalCount(tripId));
        result.put("unsynced", dbHelper.getQueueSize(tripId));
        call.resolve(result);
    }

    @PluginMethod
    public void clearQueue(PluginCall call) {
        String tripId = call.getString("tripId");
        if (tripId == null || tripId.isEmpty()) {
            call.reject("tripId is required", "INVALID_TRIP");
            return;
        }
        dbHelper.clearQueue(tripId);
        call.resolve();
    }

    @PluginMethod
    public void flushQueue(PluginCall call) {
        String endpoint = call.getString("endpoint");
        String requestedKey = call.getString("idempotencyKey");
        String tripId = call.getString("tripId");
        String authToken = call.getString("authToken", "");
        if (endpoint == null || endpoint.trim().isEmpty() || requestedKey == null || requestedKey.trim().isEmpty() || tripId == null || tripId.trim().isEmpty()) {
            call.reject("endpoint, idempotencyKey, and tripId are required", "INVALID_FLUSH_REQUEST");
            return;
        }
        if (!flushInProgress.compareAndSet(false, true)) {
            call.reject("A queue flush is already in progress", "FLUSH_IN_PROGRESS");
            return;
        }

        executorService.execute(() -> {
            try {
                GPSDatabaseHelper.LocationBatch batch = dbHelper.getOrCreateBatch(tripId, requestedKey);
                if (batch.locations.isEmpty()) {
                    call.resolve(emptyFlushResult());
                    return;
                }
                JSONObject response = postBatch(endpoint, authToken, tripId, batch);
                JSObject result = applyAcknowledgement(batch, response);
                call.resolve(result);
                notifyListeners("queueUpdate", new JSObject().put("size", dbHelper.getQueueSize(tripId)));
            } catch (Exception exception) {
                call.reject("Queue flush failed: " + exception.getMessage(), "QUEUE_FLUSH_FAILED", exception);
            } finally {
                flushInProgress.set(false);
            }
        });
    }

    private JSONObject postBatch(String endpoint, String authToken, String tripId, GPSDatabaseHelper.LocationBatch batch) throws Exception {
        JSONObject payload = new JSONObject();
        payload.put("tripId", tripId);
        payload.put("idempotencyKey", batch.idempotencyKey);
        JSONArray locations = new JSONArray();
        for (GPSDatabaseHelper.LocationRecord location : batch.locations) {
            JSONObject point = new JSONObject();
            point.put("latitude", location.latitude);
            point.put("longitude", location.longitude);
            if (location.speedKmh == null) point.put("speedKmh", JSONObject.NULL); else point.put("speedKmh", location.speedKmh);
            if (location.accuracyMeters == null) point.put("accuracyMeters", JSONObject.NULL); else point.put("accuracyMeters", location.accuracyMeters);
            point.put("capturedAt", location.capturedAt);
            point.put("source", location.source);
            locations.put(point);
        }
        payload.put("locations", locations);

        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        try {
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(30_000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Idempotency-Key", batch.idempotencyKey);
            if (!authToken.isEmpty()) connection.setRequestProperty("Authorization", "Bearer " + authToken);
            try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(connection.getOutputStream(), StandardCharsets.UTF_8))) {
                writer.write(payload.toString());
            }

            int statusCode = connection.getResponseCode();
            String responseBody = readBody(statusCode >= 200 && statusCode < 300 ? connection.getInputStream() : connection.getErrorStream());
            if (statusCode < 200 || statusCode >= 300) {
                throw new IllegalStateException("HTTP " + statusCode + (responseBody.isEmpty() ? "" : ": " + responseBody));
            }
            if (responseBody.isEmpty()) throw new IllegalStateException("The ingest endpoint returned an empty acknowledgement");
            return new JSONObject(responseBody);
        } finally {
            connection.disconnect();
        }
    }

    private String readBody(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
        }
        return body.toString();
    }

    /** Only points explicitly acknowledged by the API are marked synced. */
    private JSObject applyAcknowledgement(GPSDatabaseHelper.LocationBatch batch, JSONObject response) throws JSONException {
        if (!response.has("accepted") || !response.has("rejected")) {
            throw new IllegalStateException("Ingest acknowledgement must contain accepted and rejected counts");
        }
        int accepted = response.getInt("accepted");
        int rejected = response.getInt("rejected");
        JSONArray errors = response.optJSONArray("errors");
        if (errors == null) errors = new JSONArray();
        if (accepted < 0 || rejected < 0 || accepted + rejected != batch.locations.size()) {
            throw new IllegalStateException("Ingest acknowledgement does not match the submitted batch");
        }

        Set<Integer> rejectedIndexes = new HashSet<>();
        for (int i = 0; i < errors.length(); i++) {
            JSONObject error = errors.getJSONObject(i);
            int index = error.getInt("index");
            if (index < 0 || index >= batch.locations.size()) throw new IllegalStateException("Ingest acknowledgement contains an invalid error index");
            rejectedIndexes.add(index);
        }
        if (rejectedIndexes.size() != rejected) {
            throw new IllegalStateException("Ingest acknowledgement must identify every rejected location by index");
        }

        List<Long> acceptedIds = new ArrayList<>();
        List<Long> rejectedIds = new ArrayList<>();
        for (int index = 0; index < batch.locations.size(); index++) {
            if (rejectedIndexes.contains(index)) rejectedIds.add(batch.locations.get(index).id);
            else acceptedIds.add(batch.locations.get(index).id);
        }
        dbHelper.markSynced(acceptedIds);
        dbHelper.releaseBatch(rejectedIds);

        JSObject result = new JSObject();
        result.put("accepted", accepted);
        result.put("rejected", rejected);
        result.put("errors", errors);
        return result;
    }

    private JSObject emptyFlushResult() {
        JSObject result = new JSObject();
        result.put("accepted", 0);
        result.put("rejected", 0);
        result.put("errors", new JSArray());
        return result;
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimization(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager powerManager = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (powerManager != null && !powerManager.isIgnoringBatteryOptimizations(getContext().getPackageName()) && getActivity() != null) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(android.net.Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void isIgnoringBatteryOptimization(PluginCall call) {
        boolean ignoring = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager powerManager = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            ignoring = powerManager != null && powerManager.isIgnoringBatteryOptimizations(getContext().getPackageName());
        }
        call.resolve(new JSObject().put("ignoring", ignoring));
    }

    private JSObject permissionPayload() {
        JSObject result = new JSObject();
        result.put("location", hasLocationPermission() ? "granted" : "denied");
        boolean notificationsGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        result.put("notifications", notificationsGranted ? "granted" : "denied");
        return result;
    }

    private boolean hasLocationPermission() {
        return ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isLocationEnabled() {
        LocationManager manager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return manager.isLocationEnabled();
        return manager.isProviderEnabled(LocationManager.GPS_PROVIDER) || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
    }

    private void registerServiceReceiver() {
        serviceReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (GPSForegroundService.ACTION_LOCATION_UPDATE.equals(action)) {
                    JSObject data = new JSObject();
                    data.put("tripId", intent.getStringExtra(GPSForegroundService.EXTRA_TRIP_ID));
                    data.put("latitude", intent.getDoubleExtra("latitude", 0));
                    data.put("longitude", intent.getDoubleExtra("longitude", 0));
                    float speed = intent.getFloatExtra("speedKmh", -1f);
                    float accuracy = intent.getFloatExtra("accuracyMeters", -1f);
                    data.put("speedKmh", speed < 0 ? null : speed);
                    data.put("accuracyMeters", accuracy < 0 ? null : accuracy);
                    data.put("capturedAt", intent.getStringExtra("capturedAt"));
                    data.put("source", intent.getStringExtra("source"));
                    notifyListeners("locationUpdate", data);
                } else if (GPSForegroundService.ACTION_QUEUE_UPDATE.equals(action)) {
                    notifyListeners("queueUpdate", new JSObject().put("size", intent.getIntExtra(GPSForegroundService.EXTRA_QUEUE_SIZE, 0)));
                } else if (GPSForegroundService.ACTION_SERVICE_STATUS.equals(action)) {
                    JSObject status = new JSObject();
                    status.put("running", intent.getBooleanExtra("running", false));
                    status.put("tracking", intent.getBooleanExtra("tracking", false));
                    status.put("gpsEnabled", intent.getBooleanExtra("gpsEnabled", false));
                    status.put("permissionsGranted", intent.getBooleanExtra("permissionsGranted", false));
                    notifyListeners("serviceStatus", status);
                } else if (GPSForegroundService.ACTION_ERROR.equals(action)) {
                    JSObject error = new JSObject();
                    error.put("message", intent.getStringExtra(GPSForegroundService.EXTRA_MESSAGE));
                    error.put("code", intent.getStringExtra(GPSForegroundService.EXTRA_ERROR_CODE));
                    notifyListeners("error", error);
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(GPSForegroundService.ACTION_LOCATION_UPDATE);
        filter.addAction(GPSForegroundService.ACTION_QUEUE_UPDATE);
        filter.addAction(GPSForegroundService.ACTION_SERVICE_STATUS);
        filter.addAction(GPSForegroundService.ACTION_ERROR);
        ContextCompat.registerReceiver(getContext(), serviceReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }
}
