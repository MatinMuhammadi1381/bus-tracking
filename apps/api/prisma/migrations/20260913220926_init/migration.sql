-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProvisioningStatus" AS ENUM ('PENDING', 'PROVISIONED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BusStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "PassengerCountStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISCREPANCY');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'PENDING_DRIVER_CONFIRMATION', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrackingLinkStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AssignmentOrder" AS ENUM ('FIRST', 'SECOND');

-- CreateEnum
CREATE TYPE "HandoverSource" AS ENUM ('DRIVER', 'SUPPORT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "GPSStatus" AS ENUM ('ENABLED', 'DISABLED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PermissionStatus" AS ENUM ('GRANTED', 'DENIED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ConnectivityStatus" AS ENUM ('ONLINE', 'OFFLINE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TrackingStatus" AS ENUM ('TRACKING', 'PAUSED', 'STOPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('GPS', 'NETWORK', 'PASSIVE', 'MANUAL');

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "refreshToken" TEXT,
    "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverDevice" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "deviceIdentifier" TEXT NOT NULL,
    "provisioningStatus" "ProvisioningStatus" NOT NULL DEFAULT 'PENDING',
    "sessionStatus" "SessionStatus" NOT NULL DEFAULT 'INACTIVE',
    "revokedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bus" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "model" TEXT,
    "manufactureYear" INTEGER,
    "color" TEXT,
    "plateNumber" TEXT NOT NULL,
    "fleetNumber" TEXT,
    "busCode" TEXT,
    "status" "BusStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "geometry" JSONB,
    "totalDistanceKm" DOUBLE PRECISION,
    "estimatedDurationMinutes" INTEGER,
    "routingMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passenger" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "activeDriverId" TEXT,
    "busId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "expectedPassengerCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedPassengerCount" INTEGER NOT NULL DEFAULT 0,
    "passengerCountStatus" "PassengerCountStatus" NOT NULL DEFAULT 'PENDING',
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripDriverAssignment" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "assignmentOrder" "AssignmentOrder" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripDriverAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripDriverHandover" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "previousDriverId" TEXT NOT NULL,
    "nextDriverId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" "HandoverSource" NOT NULL,
    "sourceMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripDriverHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingLink" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "secureToken" TEXT NOT NULL,
    "status" "TrackingLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationPoint" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speedKmh" DOUBLE PRECISION,
    "accuracyMeters" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "LocationSource" NOT NULL DEFAULT 'GPS',
    "sourceMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceHealth" (
    "id" TEXT NOT NULL,
    "driverDeviceId" TEXT NOT NULL,
    "tripId" TEXT,
    "gpsStatus" "GPSStatus" NOT NULL,
    "permissionStatus" "PermissionStatus" NOT NULL,
    "connectivityStatus" "ConnectivityStatus" NOT NULL,
    "trackingStatus" "TrackingStatus" NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripPassenger" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripPassenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverConfirmation" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "confirmedPassengerCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Driver_phone_key" ON "Driver"("phone");

-- CreateIndex
CREATE INDEX "Driver_phone_idx" ON "Driver"("phone");

-- CreateIndex
CREATE INDEX "Driver_status_idx" ON "Driver"("status");

-- CreateIndex
CREATE INDEX "DriverDevice_driverId_idx" ON "DriverDevice"("driverId");

-- CreateIndex
CREATE INDEX "DriverDevice_provisioningStatus_idx" ON "DriverDevice"("provisioningStatus");

-- CreateIndex
CREATE INDEX "DriverDevice_sessionStatus_idx" ON "DriverDevice"("sessionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "DriverDevice_driverId_deviceIdentifier_key" ON "DriverDevice"("driverId", "deviceIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "Bus_plateNumber_key" ON "Bus"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Bus_fleetNumber_key" ON "Bus"("fleetNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Bus_busCode_key" ON "Bus"("busCode");

-- CreateIndex
CREATE INDEX "Bus_plateNumber_idx" ON "Bus"("plateNumber");

-- CreateIndex
CREATE INDEX "Bus_status_idx" ON "Bus"("status");

-- CreateIndex
CREATE INDEX "Route_origin_destination_idx" ON "Route"("origin", "destination");

-- CreateIndex
CREATE INDEX "Passenger_phone_idx" ON "Passenger"("phone");

-- CreateIndex
CREATE INDEX "Trip_activeDriverId_idx" ON "Trip"("activeDriverId");

-- CreateIndex
CREATE INDEX "Trip_busId_idx" ON "Trip"("busId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE INDEX "Trip_createdAt_idx" ON "Trip"("createdAt");

-- CreateIndex
CREATE INDEX "TripDriverAssignment_driverId_idx" ON "TripDriverAssignment"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "TripDriverAssignment_tripId_assignmentOrder_key" ON "TripDriverAssignment"("tripId", "assignmentOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TripDriverAssignment_tripId_driverId_key" ON "TripDriverAssignment"("tripId", "driverId");

-- CreateIndex
CREATE INDEX "TripDriverHandover_tripId_idx" ON "TripDriverHandover"("tripId");

-- CreateIndex
CREATE INDEX "TripDriverHandover_changedAt_idx" ON "TripDriverHandover"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingLink_tripId_key" ON "TrackingLink"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingLink_secureToken_key" ON "TrackingLink"("secureToken");

-- CreateIndex
CREATE INDEX "TrackingLink_secureToken_idx" ON "TrackingLink"("secureToken");

-- CreateIndex
CREATE INDEX "TrackingLink_status_idx" ON "TrackingLink"("status");

-- CreateIndex
CREATE INDEX "TrackingLink_expiresAt_idx" ON "TrackingLink"("expiresAt");

-- CreateIndex
CREATE INDEX "LocationPoint_tripId_capturedAt_idx" ON "LocationPoint"("tripId", "capturedAt");

-- CreateIndex
CREATE INDEX "LocationPoint_tripId_receivedAt_idx" ON "LocationPoint"("tripId", "receivedAt");

-- CreateIndex
CREATE INDEX "DeviceHealth_driverDeviceId_idx" ON "DeviceHealth"("driverDeviceId");

-- CreateIndex
CREATE INDEX "DeviceHealth_tripId_idx" ON "DeviceHealth"("tripId");

-- CreateIndex
CREATE INDEX "DeviceHealth_observedAt_idx" ON "DeviceHealth"("observedAt");

-- CreateIndex
CREATE INDEX "TripPassenger_passengerId_idx" ON "TripPassenger"("passengerId");

-- CreateIndex
CREATE UNIQUE INDEX "TripPassenger_tripId_passengerId_key" ON "TripPassenger"("tripId", "passengerId");

-- CreateIndex
CREATE INDEX "DriverConfirmation_tripId_idx" ON "DriverConfirmation"("tripId");

-- CreateIndex
CREATE INDEX "DriverConfirmation_driverId_idx" ON "DriverConfirmation"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverConfirmation_tripId_driverId_key" ON "DriverConfirmation"("tripId", "driverId");

-- AddForeignKey
ALTER TABLE "DriverDevice" ADD CONSTRAINT "DriverDevice_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_activeDriverId_fkey" FOREIGN KEY ("activeDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDriverAssignment" ADD CONSTRAINT "TripDriverAssignment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDriverAssignment" ADD CONSTRAINT "TripDriverAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDriverHandover" ADD CONSTRAINT "TripDriverHandover_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDriverHandover" ADD CONSTRAINT "TripDriverHandover_previousDriverId_fkey" FOREIGN KEY ("previousDriverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDriverHandover" ADD CONSTRAINT "TripDriverHandover_nextDriverId_fkey" FOREIGN KEY ("nextDriverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingLink" ADD CONSTRAINT "TrackingLink_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationPoint" ADD CONSTRAINT "LocationPoint_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceHealth" ADD CONSTRAINT "DeviceHealth_driverDeviceId_fkey" FOREIGN KEY ("driverDeviceId") REFERENCES "DriverDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceHealth" ADD CONSTRAINT "DeviceHealth_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPassenger" ADD CONSTRAINT "TripPassenger_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPassenger" ADD CONSTRAINT "TripPassenger_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "Passenger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverConfirmation" ADD CONSTRAINT "DriverConfirmation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverConfirmation" ADD CONSTRAINT "DriverConfirmation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
