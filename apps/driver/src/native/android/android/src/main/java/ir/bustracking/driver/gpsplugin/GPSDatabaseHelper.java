package ir.bustracking.driver.gpsplugin;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Durable, device-local outbox for location points. The server owns receivedAt;
 * this table only records data captured by the device and its delivery state.
 */
public class GPSDatabaseHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "gps_tracking.db";
    private static final int DATABASE_VERSION = 2;

    private static final String TABLE_LOCATIONS = "location_queue";
    private static final String COL_ID = "id";
    private static final String COL_TRIP_ID = "trip_id";
    private static final String COL_LATITUDE = "latitude";
    private static final String COL_LONGITUDE = "longitude";
    private static final String COL_SPEED_KMH = "speed_kmh";
    private static final String COL_ACCURACY_METERS = "accuracy_meters";
    private static final String COL_CAPTURED_AT = "captured_at";
    private static final String COL_SOURCE = "source";
    private static final String COL_SYNCED = "synced";
    private static final String COL_BATCH_ID = "batch_id";
    private static final String COL_CREATED_AT = "created_at";

    private static final String CREATE_TABLE = "CREATE TABLE " + TABLE_LOCATIONS + " (" +
        COL_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
        COL_TRIP_ID + " TEXT NOT NULL, " +
        COL_LATITUDE + " REAL NOT NULL, " +
        COL_LONGITUDE + " REAL NOT NULL, " +
        COL_SPEED_KMH + " REAL, " +
        COL_ACCURACY_METERS + " REAL, " +
        COL_CAPTURED_AT + " TEXT NOT NULL, " +
        COL_SOURCE + " TEXT NOT NULL, " +
        COL_SYNCED + " INTEGER NOT NULL DEFAULT 0, " +
        COL_BATCH_ID + " TEXT, " +
        COL_CREATED_AT + " TEXT NOT NULL DEFAULT (datetime('now')), " +
        "UNIQUE(" + COL_TRIP_ID + ", " + COL_CAPTURED_AT + ", " + COL_LATITUDE + ", " + COL_LONGITUDE + ")" +
        ");";

    private static final String CREATE_QUEUE_INDEX = "CREATE INDEX IF NOT EXISTS idx_location_queue_pending " +
        "ON " + TABLE_LOCATIONS + "(" + COL_TRIP_ID + ", " + COL_SYNCED + ", " + COL_BATCH_ID + ", " + COL_CAPTURED_AT + ", " + COL_ID + ");";

    public GPSDatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
        // WAL is enabled before opening the database so it applies on every open,
        // not only during first creation.
        setWriteAheadLoggingEnabled(true);
    }

    @Override
    public void onConfigure(SQLiteDatabase db) {
        super.onConfigure(db);
        db.setForeignKeyConstraintsEnabled(true);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(CREATE_TABLE);
        db.execSQL(CREATE_QUEUE_INDEX);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        if (oldVersion < 2) {
            // Keep queued points created by the Stage 1 prototype. received_at is
            // intentionally left in old databases but is never uploaded or read.
            db.execSQL("ALTER TABLE " + TABLE_LOCATIONS + " ADD COLUMN " + COL_BATCH_ID + " TEXT");
            db.execSQL(CREATE_QUEUE_INDEX);
        }
    }

    /** Returns -1 for a duplicate, which is deliberately safe and non-fatal. */
    public long insertLocation(String tripId, double latitude, double longitude,
                               Float speedKmh, Float accuracyMeters, String capturedAt, String source) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COL_TRIP_ID, tripId);
        values.put(COL_LATITUDE, latitude);
        values.put(COL_LONGITUDE, longitude);
        values.put(COL_SPEED_KMH, speedKmh);
        values.put(COL_ACCURACY_METERS, accuracyMeters);
        values.put(COL_CAPTURED_AT, capturedAt);
        values.put(COL_SOURCE, source);
        values.put(COL_SYNCED, 0);
        return db.insertWithOnConflict(TABLE_LOCATIONS, null, values, SQLiteDatabase.CONFLICT_IGNORE);
    }

    public int getQueueSize(String tripId) {
        return getCount(COL_TRIP_ID + " = ? AND " + COL_SYNCED + " = 0", new String[]{tripId});
    }

    public int getTotalCount(String tripId) {
        return getCount(COL_TRIP_ID + " = ?", new String[]{tripId});
    }

    private int getCount(String selection, String[] args) {
        SQLiteDatabase db = getReadableDatabase();
        try (Cursor cursor = db.rawQuery("SELECT COUNT(*) FROM " + TABLE_LOCATIONS + " WHERE " + selection, args)) {
            return cursor.moveToFirst() ? cursor.getInt(0) : 0;
        }
    }

    /**
     * Assigns a stable idempotency key to the oldest outstanding batch. A retry
     * reuses that key even if the caller generated a new one after an uncertain
     * network response.
     */
    public synchronized LocationBatch getOrCreateBatch(String tripId, String requestedBatchId) {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            String batchId = findExistingBatchId(db, tripId);
            if (batchId == null) {
                batchId = requestedBatchId;
                ContentValues values = new ContentValues();
                values.put(COL_BATCH_ID, batchId);
                db.update(
                    TABLE_LOCATIONS,
                    values,
                    COL_TRIP_ID + " = ? AND " + COL_SYNCED + " = 0 AND " + COL_BATCH_ID + " IS NULL",
                    new String[]{tripId}
                );
            }
            List<LocationRecord> locations = getLocationsForBatch(db, tripId, batchId);
            db.setTransactionSuccessful();
            return new LocationBatch(batchId, locations);
        } finally {
            db.endTransaction();
        }
    }

    private String findExistingBatchId(SQLiteDatabase db, String tripId) {
        try (Cursor cursor = db.query(
            TABLE_LOCATIONS,
            new String[]{COL_BATCH_ID},
            COL_TRIP_ID + " = ? AND " + COL_SYNCED + " = 0 AND " + COL_BATCH_ID + " IS NOT NULL",
            new String[]{tripId},
            null,
            null,
            COL_CAPTURED_AT + " ASC, " + COL_ID + " ASC",
            "1"
        )) {
            return cursor.moveToFirst() ? cursor.getString(0) : null;
        }
    }

    private List<LocationRecord> getLocationsForBatch(SQLiteDatabase db, String tripId, String batchId) {
        List<LocationRecord> locations = new ArrayList<>();
        try (Cursor cursor = db.query(
            TABLE_LOCATIONS,
            new String[]{COL_ID, COL_TRIP_ID, COL_LATITUDE, COL_LONGITUDE, COL_SPEED_KMH,
                COL_ACCURACY_METERS, COL_CAPTURED_AT, COL_SOURCE, COL_SYNCED, COL_BATCH_ID},
            COL_TRIP_ID + " = ? AND " + COL_SYNCED + " = 0 AND " + COL_BATCH_ID + " = ?",
            new String[]{tripId, batchId},
            null,
            null,
            COL_CAPTURED_AT + " ASC, " + COL_ID + " ASC"
        )) {
            while (cursor.moveToNext()) {
                locations.add(readLocation(cursor));
            }
        }
        return locations;
    }

    public void markSynced(Collection<Long> ids) {
        if (ids.isEmpty()) return;
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            ContentValues values = new ContentValues();
            values.put(COL_SYNCED, 1);
            values.putNull(COL_BATCH_ID);
            for (Long id : ids) {
                db.update(TABLE_LOCATIONS, values, COL_ID + " = ?", new String[]{String.valueOf(id)});
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    /** Leaves rejected rows queued, but lets a later, corrected retry form a new batch. */
    public void releaseBatch(Collection<Long> ids) {
        if (ids.isEmpty()) return;
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            ContentValues values = new ContentValues();
            values.putNull(COL_BATCH_ID);
            for (Long id : ids) {
                db.update(TABLE_LOCATIONS, values, COL_ID + " = ? AND " + COL_SYNCED + " = 0", new String[]{String.valueOf(id)});
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    public void clearQueue(String tripId) {
        getWritableDatabase().delete(TABLE_LOCATIONS, COL_TRIP_ID + " = ?", new String[]{tripId});
    }

    private LocationRecord readLocation(Cursor cursor) {
        LocationRecord record = new LocationRecord();
        record.id = cursor.getLong(cursor.getColumnIndexOrThrow(COL_ID));
        record.tripId = cursor.getString(cursor.getColumnIndexOrThrow(COL_TRIP_ID));
        record.latitude = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_LATITUDE));
        record.longitude = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_LONGITUDE));
        int speedIndex = cursor.getColumnIndexOrThrow(COL_SPEED_KMH);
        int accuracyIndex = cursor.getColumnIndexOrThrow(COL_ACCURACY_METERS);
        record.speedKmh = cursor.isNull(speedIndex) ? null : cursor.getFloat(speedIndex);
        record.accuracyMeters = cursor.isNull(accuracyIndex) ? null : cursor.getFloat(accuracyIndex);
        record.capturedAt = cursor.getString(cursor.getColumnIndexOrThrow(COL_CAPTURED_AT));
        record.source = cursor.getString(cursor.getColumnIndexOrThrow(COL_SOURCE));
        record.synced = cursor.getInt(cursor.getColumnIndexOrThrow(COL_SYNCED)) == 1;
        record.batchId = cursor.getString(cursor.getColumnIndexOrThrow(COL_BATCH_ID));
        return record;
    }

    public static class LocationBatch {
        public final String idempotencyKey;
        public final List<LocationRecord> locations;

        LocationBatch(String idempotencyKey, List<LocationRecord> locations) {
            this.idempotencyKey = idempotencyKey;
            this.locations = locations;
        }
    }

    public static class LocationRecord {
        public long id;
        public String tripId;
        public double latitude;
        public double longitude;
        public Float speedKmh;
        public Float accuracyMeters;
        public String capturedAt;
        public String source;
        public boolean synced;
        public String batchId;
    }
}
