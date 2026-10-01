import { registerPlugin } from '@capacitor/core';

export interface GPSPlugin {
  // Permissions
  requestPermissions(): Promise<{ location: 'granted' | 'denied' }>;
  checkPermissions(): Promise<{ location: 'granted' | 'denied' }>;

  // Foreground service lifecycle
  startForegroundService(options: StartForegroundServiceOptions): Promise<void>;
  stopForegroundService(): Promise<void>;
  isServiceRunning(): Promise<{ running: boolean }>;

  // Location updates
  startLocationUpdates(options: LocationUpdateOptions): Promise<void>;
  stopLocationUpdates(): Promise<void>;

  // Queue management
  getQueueSize(): Promise<{ size: number }>;
  clearQueue(): Promise<void>;
  flushQueue(options: FlushQueueOptions): Promise<FlushQueueResult>;

  // Battery optimization
  requestIgnoreBatteryOptimization(): Promise<void>;
  isIgnoringBatteryOptimization(): Promise<{ ignoring: boolean }>;

  // Event listeners
  addListener(
    eventName: 'locationUpdate',
    listener: (location: LocationData) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'queueUpdate',
    listener: (data: { size: number }) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'serviceStatus',
    listener: (status: ServiceStatus) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'error',
    listener: (error: { message: string; code: string }) => void
  ): Promise<{ remove: () => void }>;
  removeAllListeners(): Promise<void>;
}

export interface StartForegroundServiceOptions {
  notificationTitle: string;
  notificationText: string;
  notificationIcon?: string;
}

export interface LocationUpdateOptions {
  tripId: string;
  intervalMs?: number;
  fastestIntervalMs?: number;
  priority?: 'HIGH_ACCURACY' | 'BALANCED_POWER' | 'LOW_POWER';
}

export interface FlushQueueOptions {
  endpoint: string;
  idempotencyKey: string;
  authToken?: string;
}

export interface FlushQueueResult {
  accepted: number;
  rejected: number;
  errors: Array<{ index: number; reason: string }>;
}

export interface LocationData {
  tripId: string;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  accuracyMeters: number | null;
  capturedAt: string;
  source: 'GPS' | 'NETWORK' | 'PASSIVE' | 'MANUAL';
}

export interface ServiceStatus {
  running: boolean;
  gpsEnabled: boolean;
  permissionsGranted: boolean;
  tracking: boolean;
}

const GPSPlugin = registerPlugin<GPSPlugin>('GPSPlugin', {
  web: () => import('./web').then(m => new m.GPSPluginWeb()),
});

export { GPSPlugin };
