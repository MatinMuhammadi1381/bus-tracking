import { useState } from 'react';
import { useGPSTracking } from './useGPSTracking';

interface GPSTrackingScreenProps {
  tripId: string;
  apiEndpoint: string;
  authToken: string;
}

export function GPSTrackingScreen({ tripId, apiEndpoint, authToken }: GPSTrackingScreenProps) {
  const {
    isTracking,
    isServiceRunning,
    permissionsGranted,
    notificationsGranted,
    gpsEnabled,
    queueSize,
    totalQueued,
    lastLocation,
    syncStatus,
    syncError,
    batteryOptimizationIgnored,
    requestPermissions,
    startTracking,
    stopTracking,
    flushQueue,
    clearQueue,
    checkGPSStatus,
  } = useGPSTracking({
    tripId,
    apiEndpoint,
    authToken,
    onLocationUpdate: loc => console.log('Location:', loc),
    onSyncComplete: result => console.log('Sync complete:', result),
    onSyncError: error => console.error('Sync error:', error),
  });

  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const handleStartTracking = async () => {
    addLog('Starting GPS tracking...');
    const granted = await requestPermissions();
    if (!granted) {
      addLog('Permissions denied');
      return;
    }
    const started = await startTracking();
    if (started) {
      addLog('GPS tracking started successfully');
    } else {
      addLog('Failed to start GPS tracking');
    }
  };

  const handleStopTracking = async () => {
    addLog('Stopping GPS tracking...');
    const stopped = await stopTracking();
    if (stopped) {
      addLog('GPS tracking stopped');
    }
  };

  const handleFlushQueue = async () => {
    addLog('Manual flush triggered...');
    try {
      const result = await flushQueue();
      addLog(`Flush complete: ${result.accepted} accepted, ${result.rejected} rejected`);
    } catch (error) {
      addLog(`Flush failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearQueue = async () => {
    await clearQueue();
    addLog('Queue cleared');
  };

  const handleRefreshStats = async () => {
    const enabled = await checkGPSStatus();
    addLog(`GPS is ${enabled ? 'enabled' : 'disabled'}; ${queueSize} location(s) await sync`);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">GPS Tracking PoC</h2>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatusCard
          title="Tracking"
          value={isTracking ? 'Active' : 'Stopped'}
          color={isTracking ? 'green' : 'gray'}
        />
        <StatusCard
          title="Foreground Service"
          value={isServiceRunning ? 'Running' : 'Stopped'}
          color={isServiceRunning ? 'green' : 'gray'}
        />
        <StatusCard
          title="Permissions"
          value={permissionsGranted ? 'Granted' : 'Denied'}
          color={permissionsGranted ? 'green' : 'red'}
        />
        <StatusCard
          title="GPS"
          value={gpsEnabled ? 'Enabled' : 'Disabled'}
          color={gpsEnabled ? 'green' : 'red'}
        />
        <StatusCard
          title="Battery Opt."
          value={batteryOptimizationIgnored ? 'Ignored' : 'Default'}
          color={batteryOptimizationIgnored ? 'green' : 'yellow'}
        />
        <StatusCard
          title="Notifications"
          value={notificationsGranted ? 'Granted' : 'Needs permission'}
          color={notificationsGranted ? 'green' : 'yellow'}
        />
      </div>

      {/* Queue Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Queue Status</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-900">{queueSize}</p>
            <p className="text-xs text-gray-500">Unsynced</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-900">{totalQueued}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-900">{syncStatus}</p>
            <p className="text-xs text-gray-500">Sync Status</p>
          </div>
        </div>
      </div>

      {/* Last Location */}
      {lastLocation && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Last Location</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>
              <span className="text-gray-500">Lat:</span>{' '}
              <span className="font-mono">{lastLocation.latitude.toFixed(6)}</span>
            </p>
            <p>
              <span className="text-gray-500">Lng:</span>{' '}
              <span className="font-mono">{lastLocation.longitude.toFixed(6)}</span>
            </p>
            <p>
              <span className="text-gray-500">Speed:</span>{' '}
              <span className="font-mono">{lastLocation.speedKmh?.toFixed(1) || 'N/A'} km/h</span>
            </p>
            <p>
              <span className="text-gray-500">Accuracy:</span>{' '}
              <span className="font-mono">
                {lastLocation.accuracyMeters?.toFixed(1) || 'N/A'} m
              </span>
            </p>
            <p>
              <span className="text-gray-500">Source:</span>{' '}
              <span className="font-mono">{lastLocation.source}</span>
            </p>
            <p>
              <span className="text-gray-500">Time:</span>{' '}
              <span className="font-mono">
                {new Date(lastLocation.capturedAt).toLocaleTimeString()}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-3">
        <button
          onClick={handleStartTracking}
          disabled={isTracking}
          className="w-full py-3 px-4 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTracking ? 'Tracking Active' : 'Start GPS Tracking'}
        </button>

        <button
          onClick={handleStopTracking}
          disabled={!isTracking}
          className="w-full py-3 px-4 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Stop GPS Tracking
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleFlushQueue}
            disabled={queueSize === 0 || syncStatus === 'syncing'}
            className="py-3 px-4 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50"
          >
            {syncStatus === 'syncing' ? 'Syncing...' : 'Flush Queue'}
          </button>

          <button
            onClick={handleClearQueue}
            disabled={queueSize === 0}
            className="py-3 px-4 rounded-lg bg-gray-600 text-white font-medium disabled:opacity-50"
          >
            Clear Queue
          </button>
        </div>

        <button
          onClick={handleRefreshStats}
          className="w-full py-2 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium"
        >
          Refresh Stats
        </button>
      </div>

      {/* Error Display */}
      {syncError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
          {syncError}
        </div>
      )}

      {/* Logs */}
      <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
        <h3 className="text-green-400 font-mono text-sm mb-2">Logs</h3>
        <div className="font-mono text-xs text-green-300 space-y-1">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
          {logs.length === 0 && <div className="text-gray-500">No logs yet</div>}
        </div>
      </div>
    </div>
  );
}

function StatusCard({ title, value, color }: { title: string; value: string; color: string }) {
  const colors = {
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <div className={`rounded-lg border p-3 ${colors[color as keyof typeof colors] || colors.gray}`}>
      <p className="text-xs text-gray-500">{title}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
