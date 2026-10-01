/**
 * Browser-only queue used by development builds. Android production tracking
 * uses GPSDatabaseHelper through the native GPSPlugin instead.
 */
export interface QueuedLocation {
  id?: number;
  tripId: string;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  accuracyMeters: number | null;
  capturedAt: string;
  source: 'GPS' | 'NETWORK' | 'PASSIVE' | 'MANUAL';
  synced: boolean;
  batchId?: string;
}

export interface SyncResult {
  accepted: number;
  rejected: number;
  errors: Array<{ index: number; reason: string }>;
}

class InMemoryQueue {
  private locations: QueuedLocation[] = [];
  private nextId = 1;

  async initialize(): Promise<void> {
    // The native app deliberately does not use this ephemeral implementation.
  }

  async enqueue(location: Omit<QueuedLocation, 'id' | 'synced' | 'batchId'>): Promise<number> {
    const duplicate = this.locations.find(
      existing =>
        existing.tripId === location.tripId &&
        existing.capturedAt === location.capturedAt &&
        existing.latitude === location.latitude &&
        existing.longitude === location.longitude
    );
    if (duplicate?.id !== undefined) return duplicate.id;

    const record: QueuedLocation = { ...location, id: this.nextId++, synced: false };
    this.locations.push(record);
    return record.id!;
  }

  async getQueueSize(tripId: string): Promise<number> {
    return this.locations.filter(location => location.tripId === tripId && !location.synced).length;
  }

  async getUnsyncedLocations(tripId: string): Promise<QueuedLocation[]> {
    return this.locations
      .filter(location => location.tripId === tripId && !location.synced)
      .sort((left, right) => {
        const timestampOrder = Date.parse(left.capturedAt) - Date.parse(right.capturedAt);
        return timestampOrder === 0 ? (left.id ?? 0) - (right.id ?? 0) : timestampOrder;
      });
  }

  async markSynced(ids: number[]): Promise<void> {
    const accepted = new Set(ids);
    this.locations.forEach(location => {
      if (location.id !== undefined && accepted.has(location.id)) {
        location.synced = true;
        delete location.batchId;
      }
    });
  }

  async releaseBatch(ids: number[]): Promise<void> {
    const rejected = new Set(ids);
    this.locations.forEach(location => {
      if (location.id !== undefined && rejected.has(location.id)) delete location.batchId;
    });
  }

  async clearTripQueue(tripId: string): Promise<void> {
    this.locations = this.locations.filter(location => location.tripId !== tripId);
  }

  async getQueueStats(): Promise<{
    total: number;
    unsynced: number;
    byTrip: Record<string, number>;
  }> {
    const unsynced = this.locations.filter(location => !location.synced);
    const byTrip = unsynced.reduce<Record<string, number>>((result, location) => {
      result[location.tripId] = (result[location.tripId] ?? 0) + 1;
      return result;
    }, {});
    return { total: this.locations.length, unsynced: unsynced.length, byTrip };
  }
}

const queueImpl = new InMemoryQueue();

class GPSQueueService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await queueImpl.initialize();
      this.initialized = true;
    }
  }

  async enqueue(location: Omit<QueuedLocation, 'id' | 'synced' | 'batchId'>): Promise<number> {
    await this.initialize();
    return queueImpl.enqueue(location);
  }

  async getQueueSize(tripId: string): Promise<number> {
    await this.initialize();
    return queueImpl.getQueueSize(tripId);
  }

  async getUnsyncedLocations(tripId: string): Promise<QueuedLocation[]> {
    await this.initialize();
    return queueImpl.getUnsyncedLocations(tripId);
  }

  async markSynced(ids: number[]): Promise<void> {
    await this.initialize();
    return queueImpl.markSynced(ids);
  }

  async releaseBatch(ids: number[]): Promise<void> {
    await this.initialize();
    return queueImpl.releaseBatch(ids);
  }

  async clearTripQueue(tripId: string): Promise<void> {
    await this.initialize();
    return queueImpl.clearTripQueue(tripId);
  }

  async getQueueStats(): Promise<{
    total: number;
    unsynced: number;
    byTrip: Record<string, number>;
  }> {
    await this.initialize();
    return queueImpl.getQueueStats();
  }
}

export const gpsQueue = new GPSQueueService();

export class BackgroundSyncManager {
  private syncInProgress = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly options: {
      endpoint: string;
      authToken: string;
      onSyncComplete?: (result: SyncResult) => void;
      onSyncError?: (error: Error) => void;
    }
  ) {}

  startPeriodicSync(intervalMs = 30_000): void {
    if (this.syncInterval !== null) return;
    this.syncInterval = setInterval(
      () => void this.flushAllQueues().catch(() => undefined),
      intervalMs
    );
  }

  stopPeriodicSync(): void {
    if (this.syncInterval !== null) clearInterval(this.syncInterval);
    this.syncInterval = null;
  }

  async flushAllQueues(): Promise<SyncResult> {
    if (this.syncInProgress) return { accepted: 0, rejected: 0, errors: [] };
    this.syncInProgress = true;
    try {
      const stats = await gpsQueue.getQueueStats();
      const result: SyncResult = { accepted: 0, rejected: 0, errors: [] };
      for (const tripId of Object.keys(stats.byTrip)) {
        const tripResult = await this.flushTrip(tripId);
        result.accepted += tripResult.accepted;
        result.rejected += tripResult.rejected;
        result.errors.push(...tripResult.errors);
      }
      this.options.onSyncComplete?.(result);
      return result;
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.options.onSyncError?.(normalized);
      throw normalized;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async flushTrip(tripId: string): Promise<SyncResult> {
    const queued = await gpsQueue.getUnsyncedLocations(tripId);
    if (queued.length === 0) return { accepted: 0, rejected: 0, errors: [] };

    const existingBatchId = queued.find(location => location.batchId)?.batchId;
    const batchId = existingBatchId ?? generateIdempotencyKey('web-location-batch');
    const batch = existingBatchId
      ? queued.filter(location => location.batchId === existingBatchId)
      : queued;
    batch.forEach(location => {
      location.batchId = batchId;
    });
    const response = await fetch(this.options.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.options.authToken}`,
        'Idempotency-Key': batchId,
      },
      body: JSON.stringify({
        tripId,
        idempotencyKey: batchId,
        locations: batch.map(
          ({ latitude, longitude, speedKmh, accuracyMeters, capturedAt, source }) => ({
            latitude,
            longitude,
            speedKmh,
            accuracyMeters,
            capturedAt,
            source,
          })
        ),
      }),
    });
    if (!response.ok) throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    const result = (await response.json()) as SyncResult;
    if (result.accepted + result.rejected !== batch.length)
      throw new Error('Ingest acknowledgement does not match the submitted batch');

    const rejectedIndexes = new Set(result.errors.map(error => error.index));
    if (rejectedIndexes.size !== result.rejected)
      throw new Error('Ingest acknowledgement must identify every rejected location');
    await gpsQueue.markSynced(
      batch
        .filter((_, index) => !rejectedIndexes.has(index))
        .flatMap(location => (location.id === undefined ? [] : [location.id]))
    );
    await gpsQueue.releaseBatch(
      batch
        .filter((_, index) => rejectedIndexes.has(index))
        .flatMap(location => (location.id === undefined ? [] : [location.id]))
    );
    return result;
  }
}

export function generateIdempotencyKey(prefix = 'sync'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
