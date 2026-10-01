export { gpsQueue, BackgroundSyncManager, generateIdempotencyKey } from './gpsQueue';
export type { QueuedLocation, SyncResult } from './gpsQueue';
export { GPSPlugin } from './gpsPlugin';
export { useGPSTracking } from './useGPSTracking';
export { GPSTrackingScreen } from './GPSTrackingScreen';

export type {
  StartForegroundServiceOptions,
  LocationUpdateOptions,
  FlushQueueOptions,
  FlushQueueResult,
  LocationData,
  ServiceStatus,
} from './gpsPlugin';
