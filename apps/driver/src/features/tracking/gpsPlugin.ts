import { registerPlugin } from '@capacitor/core';

export type PermissionStatus = 'granted' | 'denied';

export interface PermissionResult {
  location: PermissionStatus;
  notifications: PermissionStatus;
}

export interface GPSPlugin {
  requestPermissions(): Promise<PermissionResult>;
  requestNotificationPermission(): Promise<PermissionResult>;
  checkPermissions(): Promise<PermissionResult>;
  checkGPSStatus(): Promise<{ enabled: boolean }>;

  startForegroundService(options: StartForegroundServiceOptions): Promise<void>;
  stopForegroundService(): Promise<void>;
  isServiceRunning(): Promise<{ running: boolean }>;
  getTrackingStatus(): Promise<ServiceStatus>;

  startLocationUpdates(options: LocationUpdateOptions): Promise<void>;
  stopLocationUpdates(): Promise<void>;

  getQueueSize(options: { tripId: string }): Promise<{ size: number }>;
  getQueueStats(options: { tripId: string }): Promise<{ total: number; unsynced: number }>;
  clearQueue(options: { tripId: string }): Promise<void>;
  flushQueue(options: FlushQueueOptions): Promise<FlushQueueResult>;

  requestIgnoreBatteryOptimization(): Promise<void>;
  isIgnoringBatteryOptimization(): Promise<{ ignoring: boolean }>;

  addListener(
    eventName: 'locationUpdate',
    listener: (location: LocationData) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'queueUpdate',
    listener: (data: { size: number }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'serviceStatus',
    listener: (status: ServiceStatus) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'error',
    listener: (error: PluginError) => void
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

export interface PluginListenerHandle {
  remove: () => Promise<void>;
}

export interface PluginError {
  message: string;
  code: 'GPS_DISABLED' | 'NO_CONTACT' | 'LOCATION_PERMISSION_DENIED' | string;
}

export interface StartForegroundServiceOptions {
  notificationTitle: string;
  notificationText: string;
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
  tripId: string;
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
  web: () => import('./gpsPluginWeb').then(module => new module.GPSPluginWeb()),
});

export { GPSPlugin };
