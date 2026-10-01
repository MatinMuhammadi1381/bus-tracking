import { z } from 'zod';

// GeoJSON LineString type
interface GeoJSONLineString {
  type: 'LineString';
  coordinates: number[][];
}

export const uuidSchema = z.string().uuid();

export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/);

export const driverSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: phoneSchema,
  password: z.string().min(8).max(128),
});

export const driverUpdateSchema = driverSchema.partial().omit({ password: true });

export const busSchema = z.object({
  displayName: z.string().min(1).max(100),
  model: z.string().max(100).nullable().optional(),
  manufactureYear: z.number().int().min(1950).max(2100).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  plateNumber: z.string().min(1).max(20),
  fleetNumber: z.string().max(50).nullable().optional(),
  busCode: z.string().max(50).nullable().optional(),
});

export const routeSchema = z.object({
  origin: z.string().min(1).max(255),
  destination: z.string().min(1).max(255),
  geometry: z.custom<GeoJSONLineString>().nullable().optional(),
  totalDistanceKm: z.number().positive().nullable().optional(),
  estimatedDurationMinutes: z.number().int().positive().nullable().optional(),
  routingMetadata: z.record(z.unknown()).nullable().optional(),
});

export const passengerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: phoneSchema,
});

export const tripCreateSchema = z.object({
  busId: uuidSchema,
  routeId: uuidSchema,
  expectedPassengerCount: z.number().int().min(0).default(0),
  driverIds: z.array(uuidSchema).length(2),
});

export const tripDriverConfirmSchema = z.object({
  confirmedPassengerCount: z.number().int().min(0),
});

export const tripStartSchema = z.object({
  // GPS validation happens at tracking ingestion
});

export const tripEndSchema = z.object({});

export const locationPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speedKmh: z.number().min(0).max(300).nullable().optional(),
  accuracyMeters: z.number().positive().nullable().optional(),
  capturedAt: z.string().datetime({ offset: true }),
  source: z.enum(['GPS', 'NETWORK', 'PASSIVE', 'MANUAL']).optional(),
});

export const locationIngestSchema = z.object({
  tripId: uuidSchema,
  locations: z.array(locationPointSchema).min(1).max(100),
  idempotencyKey: z.string().min(1).max(64),
});

export const deviceProvisionSchema = z.object({
  driverId: uuidSchema,
  deviceIdentifier: z.string().min(1).max(255),
});

export const trackingLinkCreateSchema = z.object({
  tripId: uuidSchema,
  expiresAt: z.string().datetime({ offset: true }),
});

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type DriverInput = z.infer<typeof driverSchema>;
export type DriverUpdateInput = z.infer<typeof driverUpdateSchema>;
export type BusInput = z.infer<typeof busSchema>;
export type RouteInput = z.infer<typeof routeSchema>;
export type PassengerInput = z.infer<typeof passengerSchema>;
export type TripCreateInput = z.infer<typeof tripCreateSchema>;
export type TripDriverConfirmInput = z.infer<typeof tripDriverConfirmSchema>;
export type LocationPointInput = z.infer<typeof locationPointSchema>;
export type LocationIngestInput = z.infer<typeof locationIngestSchema>;
export type DeviceProvisionInput = z.infer<typeof deviceProvisionSchema>;
export type TrackingLinkCreateInput = z.infer<typeof trackingLinkCreateSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
