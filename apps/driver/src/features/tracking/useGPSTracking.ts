import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GPSPlugin,
  type FlushQueueResult,
  type LocationData,
  type PluginError,
  type PluginListenerHandle,
} from './gpsPlugin';
import { generateIdempotencyKey } from './gpsQueue';
import { appVersion } from '../../config';

interface TrackingState {
  isTracking: boolean;
  isServiceRunning: boolean;
  permissionsGranted: boolean;
  notificationsGranted: boolean;
  gpsEnabled: boolean;
  queueSize: number;
  totalQueued: number;
  lastLocation: LocationData | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncError: string | null;
  batteryOptimizationIgnored: boolean;
}

interface UseGPSTrackingOptions {
  tripId: string;
  apiEndpoint: string;
  authToken: string;
  onLocationUpdate?: (location: LocationData) => void;
  onSyncComplete?: (result: FlushQueueResult) => void;
  onSyncError?: (error: Error) => void;
}

interface CallbackRefs {
  onLocationUpdate?: (location: LocationData) => void;
  onSyncComplete?: (result: FlushQueueResult) => void;
  onSyncError?: (error: Error) => void;
}

const initialState: TrackingState = {
  isTracking: false,
  isServiceRunning: false,
  permissionsGranted: false,
  notificationsGranted: false,
  gpsEnabled: false,
  queueSize: 0,
  totalQueued: 0,
  lastLocation: null,
  syncStatus: 'idle',
  syncError: null,
  batteryOptimizationIgnored: false,
};

export function useGPSTracking(options: UseGPSTrackingOptions) {
  const { tripId, apiEndpoint, authToken } = options;
  const [state, setState] = useState<TrackingState>(initialState);
  const callbacksRef = useRef<CallbackRefs>({});
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onlineListenerRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    callbacksRef.current = {
      onLocationUpdate: options.onLocationUpdate,
      onSyncComplete: options.onSyncComplete,
      onSyncError: options.onSyncError,
    };
  }, [options.onLocationUpdate, options.onSyncComplete, options.onSyncError]);

  const refreshState = useCallback(async () => {
    const [permissions, gps, status, queue, battery] = await Promise.all([
      GPSPlugin.checkPermissions(),
      GPSPlugin.checkGPSStatus(),
      GPSPlugin.getTrackingStatus(),
      GPSPlugin.getQueueStats({ tripId }),
      GPSPlugin.isIgnoringBatteryOptimization(),
    ]);
    if (!mountedRef.current) return;

    setState(previous => ({
      ...previous,
      isTracking: status.tracking,
      isServiceRunning: status.running,
      permissionsGranted: permissions.location === 'granted',
      notificationsGranted: permissions.notifications === 'granted',
      gpsEnabled: gps.enabled,
      queueSize: queue.unsynced,
      totalQueued: queue.total,
      batteryOptimizationIgnored: battery.ignoring,
    }));
  }, [tripId]);

  const requestPermissions = useCallback(async () => {
    const result = await GPSPlugin.requestPermissions();
    if (mountedRef.current) {
      setState(previous => ({
        ...previous,
        permissionsGranted: result.location === 'granted',
        notificationsGranted: result.notifications === 'granted',
        syncError: result.location === 'granted' ? null : 'Location permission was denied.',
      }));
    }
    return result.location === 'granted';
  }, []);

  const requestBatteryOptimization = useCallback(async () => {
    await GPSPlugin.requestIgnoreBatteryOptimization();
    await refreshState();
    const result = await GPSPlugin.isIgnoringBatteryOptimization();
    return result.ignoring;
  }, [refreshState]);

  const requestNotificationPermission = useCallback(async () => {
    const result = await GPSPlugin.requestNotificationPermission();
    if (mountedRef.current) {
      setState(previous => ({
        ...previous,
        notificationsGranted: result.notifications === 'granted',
      }));
    }
    return result.notifications === 'granted';
  }, []);

  const flushQueue = useCallback(async (): Promise<FlushQueueResult> => {
    try {
      const queued = await GPSPlugin.getQueueSize({ tripId });
      if (queued.size === 0) {
        const empty = { accepted: 0, rejected: 0, errors: [] };
        if (mountedRef.current)
          setState(previous => ({ ...previous, syncStatus: 'success', syncError: null }));
        return empty;
      }

      if (mountedRef.current)
        setState(previous => ({ ...previous, syncStatus: 'syncing', syncError: null }));
      const result = await GPSPlugin.flushQueue({
        endpoint: apiEndpoint,
        idempotencyKey: generateIdempotencyKey('location-batch'),
        authToken,
        tripId,
      });
      const queue = await GPSPlugin.getQueueStats({ tripId });
      if (mountedRef.current) {
        setState(previous => ({
          ...previous,
          queueSize: queue.unsynced,
          totalQueued: queue.total,
          syncStatus: result.rejected === 0 ? 'success' : 'error',
          syncError:
            result.rejected === 0
              ? null
              : `${result.rejected} location update(s) were rejected and remain queued.`,
        }));
      }
      callbacksRef.current.onSyncComplete?.(result);
      return result;
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      if (mountedRef.current)
        setState(previous => ({ ...previous, syncStatus: 'error', syncError: normalized.message }));
      callbacksRef.current.onSyncError?.(normalized);
      throw normalized;
    }
  }, [apiEndpoint, authToken, tripId]);

  const stopAutoSync = useCallback(() => {
    if (syncTimerRef.current !== null) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    if (onlineListenerRef.current) {
      window.removeEventListener('online', onlineListenerRef.current);
      onlineListenerRef.current = null;
    }
  }, []);

  const startAutoSync = useCallback(() => {
    if (syncTimerRef.current !== null) return;
    const syncWhenOnline = () => {
      if (navigator.onLine) void flushQueue().catch(() => undefined);
    };
    syncTimerRef.current = setInterval(syncWhenOnline, 30_000);
    onlineListenerRef.current = syncWhenOnline;
    window.addEventListener('online', syncWhenOnline);
  }, [flushQueue, stopAutoSync]);

  const sendHealthHeartbeat = useCallback(async () => {
    if (!authToken || !apiEndpoint) return;

    let batteryLevel: number | undefined;
    let batteryState: string | undefined;
    const batteryApi = navigator as Navigator & {
      getBattery?: () => Promise<{
        level: number;
        charging: boolean;
      }>;
    };
    if (batteryApi.getBattery) {
      const battery = await batteryApi.getBattery().catch(() => null);
      if (battery) {
        batteryLevel = Math.round(battery.level * 100);
        batteryState = battery.charging ? 'charging' : 'discharging';
      }
    }

    const payload = {
      ...(tripId ? { tripId } : {}),
      gpsStatus: state.gpsEnabled ? 'ENABLED' : 'DISABLED',
      permissionStatus: state.permissionsGranted ? 'GRANTED' : 'DENIED',
      connectivityStatus: navigator.onLine ? 'ONLINE' : 'OFFLINE',
      trackingStatus: state.isTracking ? 'TRACKING' : 'STOPPED',
      ...(batteryLevel === undefined ? {} : { batteryLevel, batteryState }),
      appVersion,
      osVersion: navigator.userAgent,
      deviceModel: navigator.userAgent,
    };

    const response = await fetch(`${apiEndpoint}/device-health/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Device health heartbeat failed (${response.status})`);
    }
  }, [apiEndpoint, authToken, state.gpsEnabled, state.isTracking, state.permissionsGranted, tripId]);

  useEffect(() => {
    mountedRef.current = true;
    void refreshState().catch(error => {
      if (mountedRef.current) setState(previous => ({ ...previous, syncError: String(error) }));
    });
    return () => {
      mountedRef.current = false;
      stopAutoSync();
    };
  }, [refreshState]);

  useEffect(() => {
    if (!authToken) return;
    const send = () => {
      void sendHealthHeartbeat().catch(error => {
        if (mountedRef.current) {
          setState(previous => ({
            ...previous,
            syncError: error instanceof Error ? error.message : String(error),
          }));
        }
      });
    };
    send();
    const timer = window.setInterval(send, 30_000);
    return () => window.clearInterval(timer);
  }, [authToken, sendHealthHeartbeat]);

  useEffect(() => {
    let disposed = false;
    const listeners: PluginListenerHandle[] = [];
    const removeListeners = async () => {
      await Promise.all(listeners.map(listener => listener.remove()));
    };

    const registerListeners = async () => {
      listeners.push(
        await GPSPlugin.addListener('locationUpdate', location => {
          if (location.tripId !== tripId) return;
          setState(previous => ({ ...previous, lastLocation: location, syncError: null }));
          callbacksRef.current.onLocationUpdate?.(location);
        }),
        await GPSPlugin.addListener('queueUpdate', data => {
          setState(previous => ({ ...previous, queueSize: data.size }));
          void GPSPlugin.getQueueStats({ tripId }).then(queue => {
            if (mountedRef.current)
              setState(previous => ({
                ...previous,
                totalQueued: queue.total,
                queueSize: queue.unsynced,
              }));
          });
        }),
        await GPSPlugin.addListener('serviceStatus', status => {
          setState(previous => ({
            ...previous,
            isServiceRunning: status.running,
            isTracking: status.tracking,
            gpsEnabled: status.gpsEnabled,
            permissionsGranted: status.permissionsGranted,
          }));
        }),
        await GPSPlugin.addListener('error', (error: PluginError) => {
          setState(previous => ({
            ...previous,
            isTracking:
              error.code === 'GPS_DISABLED' || error.code === 'LOCATION_PERMISSION_DENIED'
                ? false
                : previous.isTracking,
            gpsEnabled: error.code === 'GPS_DISABLED' ? false : previous.gpsEnabled,
            syncError: error.message,
          }));
        })
      );
      if (disposed) await removeListeners();
    };

    void registerListeners().catch(error => {
      if (mountedRef.current) setState(previous => ({ ...previous, syncError: String(error) }));
    });
    return () => {
      disposed = true;
      void removeListeners();
    };
  }, [tripId]);

  const startTracking = useCallback(async () => {
    try {
      setState(previous => ({ ...previous, syncError: null }));
      await GPSPlugin.startForegroundService({
        notificationTitle: 'GPS Tracking Active',
        notificationText: 'Bus location is being tracked in background',
      });
      await GPSPlugin.startLocationUpdates({
        tripId,
        intervalMs: 5_000,
        fastestIntervalMs: 2_000,
        priority: 'HIGH_ACCURACY',
      });
      await refreshState();
      startAutoSync();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start GPS tracking.';
      try {
        await GPSPlugin.stopForegroundService();
      } catch {
        // Preserve the original startup error.
      }
      if (mountedRef.current)
        setState(previous => ({
          ...previous,
          isTracking: false,
          isServiceRunning: false,
          syncError: message,
        }));
      return false;
    }
  }, [refreshState, startAutoSync, tripId]);

  const stopTracking = useCallback(async () => {
    stopAutoSync();
    try {
      await GPSPlugin.stopLocationUpdates();
      try {
        await flushQueue();
      } catch {
        // The durable native queue remains intact and will retry at the next start/reconnect.
      }
      await GPSPlugin.stopForegroundService();
      await refreshState();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop GPS tracking.';
      if (mountedRef.current) setState(previous => ({ ...previous, syncError: message }));
      return false;
    }
  }, [flushQueue, refreshState, stopAutoSync]);

  const clearQueue = useCallback(async () => {
    await GPSPlugin.clearQueue({ tripId });
    await refreshState();
  }, [refreshState, tripId]);

  const checkGPSStatus = useCallback(async () => {
    const gps = await GPSPlugin.checkGPSStatus();
    if (mountedRef.current) {
      setState(previous => ({
        ...previous,
        gpsEnabled: gps.enabled,
        syncError: gps.enabled ? previous.syncError : 'Location services are disabled.',
      }));
    }
    return gps.enabled;
  }, []);

  return {
    ...state,
    requestPermissions,
    requestBatteryOptimization,
    requestNotificationPermission,
    startTracking,
    stopTracking,
    flushQueue,
    clearQueue,
    checkGPSStatus,
  };
}
