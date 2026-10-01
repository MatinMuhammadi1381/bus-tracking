export type UUID = string & {
  readonly __brand: unique symbol;
};
export declare function uuid(v: string): UUID;
export interface BaseEntity {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
}
export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: number[][];
}
export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ProvisioningStatus = 'PENDING' | 'PROVISIONED' | 'REVOKED';
export type SessionStatus = 'ACTIVE' | 'INACTIVE';
export type BusStatus = 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
export type PassengerCountStatus = 'PENDING' | 'CONFIRMED' | 'DISCREPANCY';
export type TripStatus =
  | 'DRAFT'
  | 'ASSIGNED'
  | 'PENDING_DRIVER_CONFIRMATION'
  | 'READY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';
export type TrackingLinkStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';
export type AssignmentOrder = 1 | 2;
export type HandoverSource = 'DRIVER' | 'SUPPORT' | 'SYSTEM';
export type GPSStatus = 'ENABLED' | 'DISABLED' | 'UNKNOWN';
export type PermissionStatus = 'GRANTED' | 'DENIED' | 'UNKNOWN';
export type ConnectivityStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
export type TrackingStatus = 'TRACKING' | 'PAUSED' | 'STOPPED' | 'ERROR';
export type LocationSource = 'GPS' | 'NETWORK' | 'PASSIVE' | 'MANUAL';
export type UserRole = 'ADMIN' | 'SUPPORT' | 'DRIVER';
export interface Driver extends BaseEntity {
  firstName: string;
  lastName: string;
  phone: string;
  passwordHash: string;
  passwordPreview?: string | null;
  status: DriverStatus;
}
export interface DriverDevice extends BaseEntity {
  driverId: UUID;
  deviceIdentifier: string;
  provisioningStatus: ProvisioningStatus;
  sessionStatus: SessionStatus;
  revokedAt: Date | null;
  lastHeartbeatAt: Date | null;
}
export interface Bus extends BaseEntity {
  displayName: string;
  model: string | null;
  manufactureYear: number | null;
  color: string | null;
  plateNumber: string;
  fleetNumber: string | null;
  busCode: string | null;
  status: BusStatus;
}
export interface Route extends BaseEntity {
  origin: string;
  destination: string;
  geometry: GeoJSONLineString | null;
  totalDistanceKm: number | null;
  estimatedDurationMinutes: number | null;
  routingMetadata: Record<string, unknown> | null;
}
export interface Passenger extends BaseEntity {
  firstName: string;
  lastName: string;
  phone: string;
}
export interface Trip extends BaseEntity {
  activeDriverId: UUID | null;
  busId: UUID;
  routeId: UUID;
  expectedPassengerCount: number;
  confirmedPassengerCount: number;
  passengerCountStatus: PassengerCountStatus;
  status: TripStatus;
  startedAt: Date | null;
  completedAt: Date | null;
}
export interface TripDriverAssignment extends BaseEntity {
  tripId: UUID;
  driverId: UUID;
  assignmentOrder: AssignmentOrder;
}
export interface TripDriverHandover extends BaseEntity {
  tripId: UUID;
  previousDriverId: UUID;
  nextDriverId: UUID;
  changedAt: Date;
  changedBy: HandoverSource;
  sourceMetadata: Record<string, unknown> | null;
}
export interface TrackingLink extends BaseEntity {
  tripId: UUID;
  secureToken: string;
  status: TrackingLinkStatus;
  expiresAt: Date;
}
export interface LocationPoint extends BaseEntity {
  tripId: UUID;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  accuracyMeters: number | null;
  capturedAt: Date;
  receivedAt: Date;
  source: LocationSource;
  sourceMetadata: Record<string, unknown> | null;
}
export interface DeviceHealth extends BaseEntity {
  driverDeviceId: UUID;
  tripId: UUID | null;
  gpsStatus: GPSStatus;
  permissionStatus: PermissionStatus;
  connectivityStatus: ConnectivityStatus;
  trackingStatus: TrackingStatus;
  observedAt: Date;
}
export interface TripPassenger extends BaseEntity {
  tripId: UUID;
  passengerId: UUID;
}
export interface PublicTripData {
  tripId: UUID;
  status: TripStatus;
  origin: string;
  destination: string;
  bus: {
    displayName: string;
    plateNumber: string;
    busCode: string | null;
  };
  activeDriver: {
    firstName: string;
    lastName: string;
  } | null;
  passengerCount: number;
  currentLocation: {
    latitude: number;
    longitude: number;
    speedKmh: number | null;
    capturedAt: Date;
    status: 'LIVE' | 'PREDICTED' | 'LAST_KNOWN' | 'STALE';
  } | null;
  etaMinutes: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
}
export interface LocationIngestRequest {
  tripId: UUID;
  locations: Array<{
    latitude: number;
    longitude: number;
    speedKmh?: number;
    accuracyMeters?: number;
    capturedAt: string;
    source?: LocationSource;
  }>;
  idempotencyKey: string;
}
export interface LocationIngestResponse {
  accepted: number;
  rejected: number;
  errors: Array<{
    index: number;
    reason: string;
  }>;
}
