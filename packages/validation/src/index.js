"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.trackingLinkCreateSchema = exports.deviceProvisionSchema = exports.locationIngestSchema = exports.locationPointSchema = exports.tripEndSchema = exports.tripStartSchema = exports.tripDriverConfirmSchema = exports.tripCreateSchema = exports.passengerSchema = exports.routeSchema = exports.busSchema = exports.driverUpdateSchema = exports.driverSchema = exports.phoneSchema = exports.uuidSchema = void 0;
const zod_1 = require("zod");
exports.uuidSchema = zod_1.z.string().uuid();
exports.phoneSchema = zod_1.z.string().regex(/^\+?[1-9]\d{1,14}$/);
exports.driverSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(100),
    lastName: zod_1.z.string().min(1).max(100),
    phone: exports.phoneSchema,
    password: zod_1.z.string().min(8).max(128),
});
exports.driverUpdateSchema = exports.driverSchema.partial().omit({ password: true });
exports.busSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).max(100),
    model: zod_1.z.string().max(100).nullable().optional(),
    manufactureYear: zod_1.z.number().int().min(1950).max(2100).nullable().optional(),
    color: zod_1.z.string().max(50).nullable().optional(),
    plateNumber: zod_1.z.string().min(1).max(20),
    fleetNumber: zod_1.z.string().max(50).nullable().optional(),
    busCode: zod_1.z.string().max(50).nullable().optional(),
});
exports.routeSchema = zod_1.z.object({
    origin: zod_1.z.string().min(1).max(255),
    destination: zod_1.z.string().min(1).max(255),
    geometry: zod_1.z.custom().nullable().optional(),
    totalDistanceKm: zod_1.z.number().positive().nullable().optional(),
    estimatedDurationMinutes: zod_1.z.number().int().positive().nullable().optional(),
    routingMetadata: zod_1.z.record(zod_1.z.unknown()).nullable().optional(),
});
exports.passengerSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(100),
    lastName: zod_1.z.string().min(1).max(100),
    phone: exports.phoneSchema,
});
exports.tripCreateSchema = zod_1.z.object({
    busId: exports.uuidSchema,
    routeId: exports.uuidSchema,
    expectedPassengerCount: zod_1.z.number().int().min(0).default(0),
    driverIds: zod_1.z.array(exports.uuidSchema).length(2),
});
exports.tripDriverConfirmSchema = zod_1.z.object({
    confirmedPassengerCount: zod_1.z.number().int().min(0),
});
exports.tripStartSchema = zod_1.z.object({});
exports.tripEndSchema = zod_1.z.object({});
exports.locationPointSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    speedKmh: zod_1.z.number().min(0).max(300).nullable().optional(),
    accuracyMeters: zod_1.z.number().positive().nullable().optional(),
    capturedAt: zod_1.z.string().datetime({ offset: true }),
    source: zod_1.z.enum(['GPS', 'NETWORK', 'PASSIVE', 'MANUAL']).optional(),
});
exports.locationIngestSchema = zod_1.z.object({
    tripId: exports.uuidSchema,
    locations: zod_1.z.array(exports.locationPointSchema).min(1).max(100),
    idempotencyKey: zod_1.z.string().min(1).max(64),
});
exports.deviceProvisionSchema = zod_1.z.object({
    driverId: exports.uuidSchema,
    deviceIdentifier: zod_1.z.string().min(1).max(255),
});
exports.trackingLinkCreateSchema = zod_1.z.object({
    tripId: exports.uuidSchema,
    expiresAt: zod_1.z.string().datetime({ offset: true }),
});
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.number().int().positive().default(1),
    limit: zod_1.z.number().int().positive().max(100).default(20),
});
//# sourceMappingURL=index.js.map