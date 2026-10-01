package ir.bustracking.driver.gpsplugin;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Owns background location collection. Keeping FusedLocationProviderClient in
 * this foreground service (rather than the WebView plugin instance) lets
 * tracking survive activity recreation, task removal, and a sticky-service
 * process restart.
 */
public class GPSForegroundService extends Service {

    public static final String ACTION_START_FOREGROUND = "ir.bustracking.driver.gpsplugin.START_FOREGROUND";
    public static final String ACTION_START_TRACKING = "ir.bustracking.driver.gpsplugin.START_TRACKING";
    public static final String ACTION_STOP_TRACKING = "ir.bustracking.driver.gpsplugin.STOP_TRACKING";
    public static final String ACTION_STOP_SERVICE = "ir.bustracking.driver.gpsplugin.STOP_SERVICE";
    public static final String ACTION_LOCATION_UPDATE = "ir.bustracking.driver.gpsplugin.LOCATION_UPDATE";
    public static final String ACTION_QUEUE_UPDATE = "ir.bustracking.driver.gpsplugin.QUEUE_UPDATE";
    public static final String ACTION_SERVICE_STATUS = "ir.bustracking.driver.gpsplugin.SERVICE_STATUS";
    public static final String ACTION_ERROR = "ir.bustracking.driver.gpsplugin.ERROR";

    public static final String EXTRA_TRIP_ID = "tripId";
    public static final String EXTRA_INTERVAL_MS = "intervalMs";
    public static final String EXTRA_FASTEST_INTERVAL_MS = "fastestIntervalMs";
    public static final String EXTRA_PRIORITY = "priority";
    public static final String EXTRA_NOTIFICATION_TITLE = "notificationTitle";
    public static final String EXTRA_NOTIFICATION_TEXT = "notificationText";
    public static final String EXTRA_MESSAGE = "message";
    public static final String EXTRA_ERROR_CODE = "code";
    public static final String EXTRA_QUEUE_SIZE = "size";

    private static final String CHANNEL_ID = "gps_tracking_channel";
    private static final int NOTIFICATION_ID = 1001;
    private static final long NO_CONTACT_AFTER_MS = 30_000L;
    private static final String PREFS_NAME = "gps_tracking_service";
    private static final String PREF_SERVICE_RUNNING = "service_running";
    private static final String PREF_TRACKING_ACTIVE = "tracking_active";
    private static final String PREF_TRIP_ID = "trip_id";
    private static final String PREF_INTERVAL_MS = "interval_ms";
    private static final String PREF_FASTEST_INTERVAL_MS = "fastest_interval_ms";
    private static final String PREF_PRIORITY = "priority";
    private static final String PREF_TITLE = "notification_title";
    private static final String PREF_TEXT = "notification_text";

    private FusedLocationProviderClient fusedLocationClient;
    private GPSDatabaseHelper dbHelper;
    private SharedPreferences preferences;
    private LocationCallback locationCallback;
    private Handler healthHandler;
    private BroadcastReceiver providersChangedReceiver;

    private boolean receivingLocations;
    private long lastLocationAtMs;
    private String notificationTitle = "GPS Tracking Active";
    private String notificationText = "Bus location is being tracked";

    @Override
    public void onCreate() {
        super.onCreate();
        preferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        dbHelper = new GPSDatabaseHelper(getApplicationContext());
        healthHandler = new Handler(Looper.getMainLooper());
        createNotificationChannel();
        createLocationCallback();
        registerProviderChangeReceiver();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();

        if (ACTION_STOP_SERVICE.equals(action)) {
            stopTracking();
            preferences.edit().putBoolean(PREF_TRACKING_ACTIVE, false).putBoolean(PREF_SERVICE_RUNNING, false).apply();
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        if (intent == null && !preferences.getBoolean(PREF_TRACKING_ACTIVE, false)) {
            preferences.edit().putBoolean(PREF_SERVICE_RUNNING, false).apply();
            stopSelf();
            return START_NOT_STICKY;
        }

        updateNotificationText(intent);
        startAsForeground();
        preferences.edit().putBoolean(PREF_SERVICE_RUNNING, true).apply();

        if (ACTION_STOP_TRACKING.equals(action)) {
            stopTracking();
            preferences.edit().putBoolean(PREF_TRACKING_ACTIVE, false).apply();
            broadcastStatus();
            return START_STICKY;
        }

        if (ACTION_START_TRACKING.equals(action)) {
            saveTrackingConfiguration(intent);
        }

        if (ACTION_START_TRACKING.equals(action) || (intent == null && preferences.getBoolean(PREF_TRACKING_ACTIVE, false))) {
            startTrackingIfHealthy();
        } else {
            broadcastStatus();
        }

        return START_STICKY;
    }

    private void updateNotificationText(Intent intent) {
        if (intent == null) {
            notificationTitle = preferences.getString(PREF_TITLE, notificationTitle);
            notificationText = preferences.getString(PREF_TEXT, notificationText);
            return;
        }
        String title = intent.getStringExtra(EXTRA_NOTIFICATION_TITLE);
        String text = intent.getStringExtra(EXTRA_NOTIFICATION_TEXT);
        if (title != null && !title.trim().isEmpty()) notificationTitle = title;
        if (text != null && !text.trim().isEmpty()) notificationText = text;
        preferences.edit().putString(PREF_TITLE, notificationTitle).putString(PREF_TEXT, notificationText).apply();
    }

    private void saveTrackingConfiguration(Intent intent) {
        String tripId = intent.getStringExtra(EXTRA_TRIP_ID);
        if (tripId == null || tripId.trim().isEmpty()) {
            broadcastError("tripId is required to start tracking", "INVALID_TRIP");
            return;
        }
        preferences.edit()
            .putString(PREF_TRIP_ID, tripId)
            .putLong(PREF_INTERVAL_MS, Math.max(1_000L, intent.getLongExtra(EXTRA_INTERVAL_MS, 5_000L)))
            .putLong(PREF_FASTEST_INTERVAL_MS, Math.max(1_000L, intent.getLongExtra(EXTRA_FASTEST_INTERVAL_MS, 2_000L)))
            .putString(PREF_PRIORITY, intent.getStringExtra(EXTRA_PRIORITY))
            .putBoolean(PREF_TRACKING_ACTIVE, true)
            .apply();
    }

    @SuppressLint("MissingPermission")
    private void startTrackingIfHealthy() {
        if (!preferences.getBoolean(PREF_TRACKING_ACTIVE, false)) return;
        if (!hasLocationPermission()) {
            stopTracking();
            broadcastError("Location permission was revoked", "LOCATION_PERMISSION_DENIED");
            broadcastStatus();
            return;
        }
        if (!isLocationEnabled()) {
            stopTracking();
            broadcastError("Location services are disabled", "GPS_DISABLED");
            broadcastStatus();
            return;
        }

        String tripId = preferences.getString(PREF_TRIP_ID, null);
        if (tripId == null || tripId.isEmpty()) {
            stopTracking();
            broadcastError("No active trip is stored for tracking", "INVALID_TRIP");
            return;
        }

        long intervalMs = preferences.getLong(PREF_INTERVAL_MS, 5_000L);
        long fastestIntervalMs = Math.min(intervalMs, preferences.getLong(PREF_FASTEST_INTERVAL_MS, 2_000L));
        LocationRequest request = new LocationRequest.Builder(intervalMs)
            .setMinUpdateIntervalMillis(fastestIntervalMs)
            .setPriority(toPriority(preferences.getString(PREF_PRIORITY, "HIGH_ACCURACY")))
            .setWaitForAccurateLocation(false)
            .build();

        if (receivingLocations) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }
        fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
        receivingLocations = true;
        scheduleHealthCheck();
        broadcastStatus();
    }

    private int toPriority(String value) {
        if ("BALANCED_POWER".equals(value)) return Priority.PRIORITY_BALANCED_POWER_ACCURACY;
        if ("LOW_POWER".equals(value)) return Priority.PRIORITY_LOW_POWER;
        return Priority.PRIORITY_HIGH_ACCURACY;
    }

    private void stopTracking() {
        healthHandler.removeCallbacksAndMessages(null);
        if (receivingLocations) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
            receivingLocations = false;
        }
    }

    private void createLocationCallback() {
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null || !preferences.getBoolean(PREF_TRACKING_ACTIVE, false)) return;
                List<Location> locations = locationResult.getLocations();
                for (Location location : locations) {
                    persistAndBroadcastLocation(location);
                }
            }
        };
    }

    private void persistAndBroadcastLocation(Location location) {
        String tripId = preferences.getString(PREF_TRIP_ID, null);
        if (tripId == null || tripId.isEmpty()) return;

        long capturedAtMs = location.getTime() > 0 ? location.getTime() : System.currentTimeMillis();
        String capturedAt = toUtcIso(capturedAtMs);
        dbHelper.insertLocation(
            tripId,
            location.getLatitude(),
            location.getLongitude(),
            location.hasSpeed() ? location.getSpeed() * 3.6f : null,
            location.hasAccuracy() ? location.getAccuracy() : null,
            capturedAt,
            sourceFor(location.getProvider())
        );
        lastLocationAtMs = System.currentTimeMillis();

        Intent update = new Intent(ACTION_LOCATION_UPDATE).setPackage(getPackageName());
        update.putExtra(EXTRA_TRIP_ID, tripId);
        update.putExtra("latitude", location.getLatitude());
        update.putExtra("longitude", location.getLongitude());
        update.putExtra("speedKmh", location.hasSpeed() ? location.getSpeed() * 3.6f : -1f);
        update.putExtra("accuracyMeters", location.hasAccuracy() ? location.getAccuracy() : -1f);
        update.putExtra("capturedAt", capturedAt);
        update.putExtra("source", sourceFor(location.getProvider()));
        sendBroadcast(update);

        Intent queue = new Intent(ACTION_QUEUE_UPDATE).setPackage(getPackageName());
        queue.putExtra(EXTRA_QUEUE_SIZE, dbHelper.getQueueSize(tripId));
        sendBroadcast(queue);
        broadcastStatus();
    }

    private String toUtcIso(long millis) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date(millis));
    }

    private String sourceFor(String provider) {
        if ("network".equals(provider)) return "NETWORK";
        if ("passive".equals(provider)) return "PASSIVE";
        return "GPS";
    }

    private void scheduleHealthCheck() {
        healthHandler.removeCallbacksAndMessages(null);
        healthHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (!preferences.getBoolean(PREF_TRACKING_ACTIVE, false)) return;
                long age = lastLocationAtMs == 0 ? NO_CONTACT_AFTER_MS : System.currentTimeMillis() - lastLocationAtMs;
                if (age >= NO_CONTACT_AFTER_MS) {
                    broadcastError("No location update has been received for at least 30 seconds", "NO_CONTACT");
                    broadcastStatus();
                }
                healthHandler.postDelayed(this, NO_CONTACT_AFTER_MS);
            }
        }, NO_CONTACT_AFTER_MS);
    }

    private void registerProviderChangeReceiver() {
        providersChangedReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (!preferences.getBoolean(PREF_TRACKING_ACTIVE, false)) return;
                if (isLocationEnabled()) {
                    startTrackingIfHealthy();
                } else {
                    stopTracking();
                    broadcastError("Location services are disabled", "GPS_DISABLED");
                    broadcastStatus();
                }
            }
        };
        IntentFilter filter = new IntentFilter(LocationManager.PROVIDERS_CHANGED_ACTION);
        ContextCompat.registerReceiver(this, providersChangedReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    private boolean hasLocationPermission() {
        return ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isLocationEnabled() {
        LocationManager manager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return manager.isLocationEnabled();
        return manager.isProviderEnabled(LocationManager.GPS_PROVIDER) || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
    }

    private void broadcastStatus() {
        Intent status = new Intent(ACTION_SERVICE_STATUS).setPackage(getPackageName());
        status.putExtra("running", preferences.getBoolean(PREF_SERVICE_RUNNING, false));
        status.putExtra("tracking", preferences.getBoolean(PREF_TRACKING_ACTIVE, false) && receivingLocations);
        status.putExtra("gpsEnabled", isLocationEnabled());
        status.putExtra("permissionsGranted", hasLocationPermission());
        sendBroadcast(status);
    }

    private void broadcastError(String message, String code) {
        Intent error = new Intent(ACTION_ERROR).setPackage(getPackageName());
        error.putExtra(EXTRA_MESSAGE, message);
        error.putExtra(EXTRA_ERROR_CODE, code);
        sendBroadcast(error);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "GPS Tracking", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Background GPS tracking for bus tracking");
        channel.setSound(null, null);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    private void startAsForeground() {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launchIntent != null) launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(notificationTitle)
            .setContentText(notificationText)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOnlyAlertOnce(true)
            .build();

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            : 0;
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Deliberately retain the foreground service when the user removes the
        // activity from recents. START_STICKY restores it if Android kills it.
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        stopTracking();
        preferences.edit().putBoolean(PREF_SERVICE_RUNNING, false).apply();
        if (providersChangedReceiver != null) {
            unregisterReceiver(providersChangedReceiver);
        }
        dbHelper.close();
        super.onDestroy();
    }
}
