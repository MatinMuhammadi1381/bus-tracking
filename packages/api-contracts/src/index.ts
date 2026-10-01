import { z } from 'zod';

const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.nullable(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.unknown()).optional(),
      })
      .nullable(),
    meta: z
      .object({
        timestamp: z.string().datetime(),
        requestId: z.string().uuid(),
      })
      .optional(),
  });

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  apiResponseSchema(
    z.object({
      items: z.array(itemSchema),
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      totalPages: z.number().int().nonnegative(),
    })
  );

export const errorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  DEVICE_REVOKED: 'DEVICE_REVOKED',
  GPS_REQUIRED: 'GPS_REQUIRED',
  TRIP_LOCKED: 'TRIP_LOCKED',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
} as const;

export type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

export const apiErrorSchema = z.object({
  code: z.nativeEnum(errorCodes),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const healthCheckResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  timestamp: z.string().datetime(),
  version: z.string(),
  uptime: z.number(),
  checks: z
    .array(
      z.object({
        name: z.string(),
        status: z.enum(['pass', 'warn', 'fail']),
        details: z.record(z.unknown()).optional(),
      })
    )
    .optional(),
});

export const websocketEvents = {
  LOCATION_UPDATE: 'location:update',
  TRIP_STATUS_CHANGE: 'trip:status_change',
  DRIVER_HANDOVER: 'driver:handover',
  DEVICE_HEALTH: 'device:health',
  TRACKING_STATUS: 'tracking:status',
} as const;

export type WebSocketEvent = (typeof websocketEvents)[keyof typeof websocketEvents];

export const locationUpdatePayloadSchema = z.object({
  tripId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  speedKmh: z.number().nullable(),
  accuracyMeters: z.number().nullable(),
  capturedAt: z.string().datetime(),
  status: z.enum(['LIVE', 'PREDICTED', 'LAST_KNOWN', 'STALE']),
});

export type LocationUpdatePayload = z.infer<typeof locationUpdatePayloadSchema>;

export const tripStatusChangePayloadSchema = z.object({
  tripId: z.string().uuid(),
  status: z.enum([
    'DRAFT',
    'ASSIGNED',
    'PENDING_DRIVER_CONFIRMATION',
    'READY',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
  ]),
  activeDriverId: z.string().uuid().nullable(),
  updatedAt: z.string().datetime(),
});

export type TripStatusChangePayload = z.infer<typeof tripStatusChangePayloadSchema>;

export const driverHandoverPayloadSchema = z.object({
  tripId: z.string().uuid(),
  previousDriverId: z.string().uuid(),
  nextDriverId: z.string().uuid(),
  changedAt: z.string().datetime(),
  changedBy: z.enum(['DRIVER', 'SUPPORT', 'SYSTEM']),
});

export type DriverHandoverPayload = z.infer<typeof driverHandoverPayloadSchema>;

export const locationPointSchema = z.object({
  id: z.string().uuid(),
  tripId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  speedKmh: z.number().nullable(),
  accuracyMeters: z.number().nullable(),
  capturedAt: z.string().datetime(),
  receivedAt: z.string().datetime(),
  source: z.enum(['GPS', 'NETWORK', 'PASSIVE', 'MANUAL']),
  idempotencyKey: z.string().nullable(),
});

export type LocationPoint = z.infer<typeof locationPointSchema>;

// Public Tracking Types
export const publicTripResponseSchema = z.object({
  tripId: z.string().uuid(),
  status: z.enum([
    'DRAFT',
    'ASSIGNED',
    'PENDING_DRIVER_CONFIRMATION',
    'READY',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
  ]),
  origin: z.string(),
  destination: z.string(),
  bus: z.object({
    displayName: z.string(),
    plateNumber: z.string(),
    busCode: z.string().nullable(),
  }),
  activeDriver: z
    .object({
      firstName: z.string(),
      lastName: z.string(),
    })
    .nullable(),
  passengerCount: z.number().int().nonnegative(),
  currentLocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      speedKmh: z.number().nullable(),
      capturedAt: z.string().datetime(),
      status: z.enum(['LIVE', 'PREDICTED', 'LAST_KNOWN', 'STALE']),
    })
    .nullable(),
  etaMinutes: z.number().int().nonnegative().nullable(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
});

export type PublicTripResponse = z.infer<typeof publicTripResponseSchema>;

export const publicLocationPointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  speedKmh: z.number().nullable(),
  accuracyMeters: z.number().nullable(),
  capturedAt: z.string().datetime(),
  status: z.enum(['LIVE', 'PREDICTED', 'LAST_KNOWN', 'STALE']),
});

export type PublicLocationPoint = z.infer<typeof publicLocationPointSchema>;

export const publicLocationHistoryResponseSchema = z.array(publicLocationPointSchema);

export type PublicLocationHistoryResponse = z.infer<typeof publicLocationHistoryResponseSchema>;
