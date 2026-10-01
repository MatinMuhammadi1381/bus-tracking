import { WebPlugin } from '@capacitor/core';
import type {
  FlushQueueOptions,
  FlushQueueResult,
  GPSPlugin,
  LocationUpdateOptions,
  PermissionResult,
  ServiceStatus,
  StartForegroundServiceOptions,
} from '../../features/tracking/gpsPlugin';

/** Browser-only development fallback. Android uses the native plugin. */
export class GPSPluginWeb extends WebPlugin implements GPSPlugin {
  private watchId: number | null = null;
  private serviceRunning = false;
  private tracking = false;

  async requestPermissions(): Promise<PermissionResult> {
    if (!navigator.geolocation)
      return { location: 'denied', notifications: this.notificationStatus() };

    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        () => resolve({ location: 'granted', notifications: this.notificationStatus() }),
        () => resolve({ location: 'denied', notifications: this.notificationStatus() }),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 }
      );
    });
  }

  async requestNotificationPermission(): Promise<PermissionResult> {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    const permissions = await this.checkPermissions();
    return { ...permissions, notifications: this.notificationStatus() };
  }

  async checkPermissions(): Promise<PermissionResult> {
    if (!navigator.geolocation)
      return { location: 'denied', notifications: this.notificationStatus() };
    if (!navigator.permissions)
      return { location: 'denied', notifications: this.notificationStatus() };

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return {
        location: result.state === 'granted' ? 'granted' : 'denied',
        notifications: this.notificationStatus(),
      };
    } catch {
      return { location: 'denied', notifications: this.notificationStatus() };
    }
  }

  async checkGPSStatus(): Promise<{ enabled: boolean }> {
    return { enabled: Boolean(navigator.geolocation) };
  }

  async startForegroundService(_options: StartForegroundServiceOptions): Promise<void> {
    this.serviceRunning = true;
    this.emitStatus();
  }

  async stopForegroundService(): Promise<void> {
    this.serviceRunning = false;
    this.emitStatus();
  }

  async isServiceRunning(): Promise<{ running: boolean }> {
    return { running: this.serviceRunning };
  }

  async getTrackingStatus(): Promise<ServiceStatus> {
    const permissions = await this.checkPermissions();
    const gps = await this.checkGPSStatus();
    return {
      running: this.serviceRunning,
      tracking: this.tracking,
      gpsEnabled: gps.enabled,
      permissionsGranted: permissions.location === 'granted',
    };
  }

  async startLocationUpdates(options: LocationUpdateOptions): Promise<void> {
    if (!navigator.geolocation) throw new Error('Browser geolocation is unavailable');
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);

    this.watchId = navigator.geolocation.watchPosition(
      position => {
        this.notifyListeners('locationUpdate', {
          tripId: options.tripId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speedKmh: position.coords.speed === null ? null : position.coords.speed * 3.6,
          accuracyMeters: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
          source: 'GPS',
        });
      },
      error => {
        this.tracking = false;
        this.notifyListeners('error', { message: error.message, code: 'WEB_GEOLOCATION_ERROR' });
        this.emitStatus();
      },
      {
        enableHighAccuracy: options.priority !== 'LOW_POWER',
        maximumAge: 0,
        timeout: Math.max(options.intervalMs ?? 5_000, 5_000),
      }
    );
    this.tracking = true;
    this.emitStatus();
  }

  async stopLocationUpdates(): Promise<void> {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    this.tracking = false;
    this.emitStatus();
  }

  async getQueueSize(): Promise<{ size: number }> {
    return { size: 0 };
  }

  async getQueueStats(): Promise<{ total: number; unsynced: number }> {
    return { total: 0, unsynced: 0 };
  }

  async clearQueue(): Promise<void> {
    // The browser fallback does not claim durable queue support.
  }

  async flushQueue(_options: FlushQueueOptions): Promise<FlushQueueResult> {
    throw new Error('Offline sync is available only in the Android native plugin');
  }

  async requestIgnoreBatteryOptimization(): Promise<void> {
    // Browser platforms do not expose Android battery optimization controls.
  }

  async isIgnoringBatteryOptimization(): Promise<{ ignoring: boolean }> {
    return { ignoring: false };
  }

  private notificationStatus(): 'granted' | 'denied' {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission === 'granted' ? 'granted' : 'denied';
  }

  private emitStatus(): void {
    void this.getTrackingStatus().then(status => this.notifyListeners('serviceStatus', status));
  }
}
