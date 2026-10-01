import { z } from 'zod';
interface GeoJSONLineString {
  type: 'LineString';
  coordinates: number[][];
}
export declare const uuidSchema: z.ZodString;
export declare const phoneSchema: z.ZodString;
export declare const driverSchema: z.ZodObject<
  {
    firstName: z.ZodString;
    lastName: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    phone: string;
    firstName: string;
    lastName: string;
    password: string;
  },
  {
    phone: string;
    firstName: string;
    lastName: string;
    password: string;
  }
>;
export declare const driverUpdateSchema: z.ZodObject<
  Omit<
    {
      firstName: z.ZodOptional<z.ZodString>;
      lastName: z.ZodOptional<z.ZodString>;
      phone: z.ZodOptional<z.ZodString>;
      password: z.ZodOptional<z.ZodString>;
    },
    'password'
  >,
  'strip',
  z.ZodTypeAny,
  {
    phone?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
  },
  {
    phone?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
  }
>;
export declare const busSchema: z.ZodObject<
  {
    displayName: z.ZodString;
    model: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    manufactureYear: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    plateNumber: z.ZodString;
    fleetNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    busCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    displayName: string;
    plateNumber: string;
    model?: string | null | undefined;
    manufactureYear?: number | null | undefined;
    color?: string | null | undefined;
    fleetNumber?: string | null | undefined;
    busCode?: string | null | undefined;
  },
  {
    displayName: string;
    plateNumber: string;
    model?: string | null | undefined;
    manufactureYear?: number | null | undefined;
    color?: string | null | undefined;
    fleetNumber?: string | null | undefined;
    busCode?: string | null | undefined;
  }
>;
export declare const routeSchema: z.ZodObject<
  {
    origin: z.ZodString;
    destination: z.ZodString;
    geometry: z.ZodOptional<
      z.ZodNullable<z.ZodType<GeoJSONLineString, z.ZodTypeDef, GeoJSONLineString>>
    >;
    totalDistanceKm: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    estimatedDurationMinutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    routingMetadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    origin: string;
    destination: string;
    geometry?: GeoJSONLineString | null | undefined;
    totalDistanceKm?: number | null | undefined;
    estimatedDurationMinutes?: number | null | undefined;
    routingMetadata?: Record<string, unknown> | null | undefined;
  },
  {
    origin: string;
    destination: string;
    geometry?: GeoJSONLineString | null | undefined;
    totalDistanceKm?: number | null | undefined;
    estimatedDurationMinutes?: number | null | undefined;
    routingMetadata?: Record<string, unknown> | null | undefined;
  }
>;
export declare const passengerSchema: z.ZodObject<
  {
    firstName: z.ZodString;
    lastName: z.ZodString;
    phone: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    phone: string;
    firstName: string;
    lastName: string;
  },
  {
    phone: string;
    firstName: string;
    lastName: string;
  }
>;
export declare const tripCreateSchema: z.ZodObject<
  {
    busId: z.ZodString;
    routeId: z.ZodString;
    expectedPassengerCount: z.ZodDefault<z.ZodNumber>;
    driverIds: z.ZodArray<z.ZodString, 'many'>;
  },
  'strip',
  z.ZodTypeAny,
  {
    busId: string;
    routeId: string;
    expectedPassengerCount: number;
    driverIds: string[];
  },
  {
    busId: string;
    routeId: string;
    driverIds: string[];
    expectedPassengerCount?: number | undefined;
  }
>;
export declare const tripDriverConfirmSchema: z.ZodObject<
  {
    confirmedPassengerCount: z.ZodNumber;
  },
  'strip',
  z.ZodTypeAny,
  {
    confirmedPassengerCount: number;
  },
  {
    confirmedPassengerCount: number;
  }
>;
export declare const tripStartSchema: z.ZodObject<{}, 'strip', z.ZodTypeAny, {}, {}>;
export declare const tripEndSchema: z.ZodObject<{}, 'strip', z.ZodTypeAny, {}, {}>;
export declare const locationPointSchema: z.ZodObject<
  {
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    speedKmh: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    accuracyMeters: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    capturedAt: z.ZodString;
    source: z.ZodOptional<z.ZodEnum<['GPS', 'NETWORK', 'PASSIVE', 'MANUAL']>>;
  },
  'strip',
  z.ZodTypeAny,
  {
    latitude: number;
    longitude: number;
    capturedAt: string;
    speedKmh?: number | null | undefined;
    accuracyMeters?: number | null | undefined;
    source?: 'GPS' | 'NETWORK' | 'PASSIVE' | 'MANUAL' | undefined;
  },
  {
    latitude: number;
    longitude: number;
    capturedAt: string;
    speedKmh?: number | null | undefined;
    accuracyMeters?: number | null | undefined;
    source?: 'GPS' | 'NETWORK' | 'PASSIVE' | 'MANUAL' | undefined;
  }
>;
export declare const locationIngestSchema: z.ZodObject<
  {
    tripId: z.ZodString;
    locations: z.ZodArray<
      z.ZodObject<
        {
          latitude: z.ZodNumber;
          longitude: z.ZodNumber;
          speedKmh: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          accuracyMeters: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
          capturedAt: z.ZodString;
          source: z.ZodOptional<z.ZodEnum<['GPS', 'NETWORK', 'PASSIVE', 'MANUAL']>>;
        },
        'strip',
        z.ZodTypeAny,
        {
          latitude: number;
          longitude: number;
          capturedAt: string;
          speedKmh?: number | null | undefined;
          accuracyMeters?: number | null | undefined;
          source?: 'GPS' | 'NETWORK' | 'PASSIVE' | 'MANUAL' | undefined;
        },
        {
          latitude: number;
          longitude: number;
          capturedAt: string;
          speedKmh?: number | null | undefined;
          accuracyMeters?: number | null | undefined;
          source?: 'GPS' | 'NETWORK' | 'PASSIVE' | 'MANUAL' | undefined;
        }
      >,
      'many'
    >;
    idempotencyKey: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    tripId: string;
    idempotencyKey: string;
    locations: {
      latitude: number;
      longitude: number;
      capturedAt: string;
      speedKmh?: number | null | undefined;
      accuracyMeters?: number | null | undefined;
      source?: 'GPS' | 'NETWORK' | 'PASSIVE' | 'MANUAL' | undefined;
    }[];
  },
  {
    tripId: string;
    idempotencyKey: string;
    locations: {
      latitude: number;
      longitude: number;
      capturedAt: string;
      speedKmh?: number | null | undefined;
      accuracyMeters?: number | null | undefined;
      source?: 'GPS' | 'NETWORK' | 'PASSIVE' | 'MANUAL' | undefined;
    }[];
  }
>;
export declare const deviceProvisionSchema: z.ZodObject<
  {
    driverId: z.ZodString;
    deviceIdentifier: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    driverId: string;
    deviceIdentifier: string;
  },
  {
    driverId: string;
    deviceIdentifier: string;
  }
>;
export declare const trackingLinkCreateSchema: z.ZodObject<
  {
    tripId: z.ZodString;
    expiresAt: z.ZodString;
  },
  'strip',
  z.ZodTypeAny,
  {
    tripId: string;
    expiresAt: string;
  },
  {
    tripId: string;
    expiresAt: string;
  }
>;
export declare const paginationSchema: z.ZodObject<
  {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
  },
  'strip',
  z.ZodTypeAny,
  {
    page: number;
    limit: number;
  },
  {
    page?: number | undefined;
    limit?: number | undefined;
  }
>;
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
export {};
