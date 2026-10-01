import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  LocationIngestDto,
  LocationQueryDto,
  LocationIngestResponseDto,
  LocationPointResponseDto,
} from './dto/location-ingest.dto';
import { generateIdempotencyKey } from '@bus-tracking/shared-utils';

@Injectable()
export class TrackingService {
  private readonly MAX_BATCH_SIZE = 100;
  private readonly MAX_SPEED_KMH = 300;
  private readonly MAX_ACCURACY_METERS = 100;
  private readonly MAX_LOCATION_AGE_HOURS = 24;

  constructor(private prisma: PrismaService) {}

  async ingestLocations(dto: LocationIngestDto): Promise<LocationIngestResponseDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: dto.tripId },
      select: { id: true, status: true, activeDriverId: true },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Trip is not in progress');
    }

    const existingIdempotency = await this.prisma.locationPoint.findFirst({
      where: { idempotencyKey: dto.idempotencyKey },
      select: { id: true },
    });

    if (existingIdempotency) {
      return {
        accepted: 0,
        rejected: dto.locations.length,
        errors: [{ index: -1, reason: 'Duplicate idempotency key' }],
      };
    }

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - this.MAX_LOCATION_AGE_HOURS * 60 * 60 * 1000);

    const accepted: number[] = [];
    const rejected: number[] = [];
    const errors: Array<{ index: number; reason: string }> = [];

    for (let i = 0; i < dto.locations.length; i++) {
      const loc = dto.locations[i];
      const capturedAt = new Date(loc.capturedAt);

      if (capturedAt > now) {
        errors.push({ index: i, reason: 'capturedAt cannot be in the future' });
        rejected.push(i);
        continue;
      }

      if (capturedAt < cutoffTime) {
        errors.push({ index: i, reason: 'Location too old (>24h)' });
        rejected.push(i);
        continue;
      }

      if (loc.speedKmh !== undefined && loc.speedKmh > this.MAX_SPEED_KMH) {
        errors.push({ index: i, reason: `Speed exceeds maximum ${this.MAX_SPEED_KMH} km/h` });
        rejected.push(i);
        continue;
      }

      if (loc.accuracyMeters !== undefined && loc.accuracyMeters > this.MAX_ACCURACY_METERS) {
        errors.push({
          index: i,
          reason: `Accuracy exceeds maximum ${this.MAX_ACCURACY_METERS} meters`,
        });
        rejected.push(i);
        continue;
      }

      accepted.push(i);
    }

    if (accepted.length > 0) {
      await this.prisma.$transaction(async tx => {
        await tx.locationPoint.createMany({
          data: accepted.map(idx => {
            const loc = dto.locations[idx];
            return {
              tripId: dto.tripId,
              latitude: loc.latitude,
              longitude: loc.longitude,
              speedKmh: loc.speedKmh ?? null,
              accuracyMeters: loc.accuracyMeters ?? null,
              capturedAt: new Date(loc.capturedAt),
              receivedAt: new Date(),
              source: loc.source ?? 'GPS',
              idempotencyKey: dto.idempotencyKey + '_' + idx,
            };
          }),
        });
      });
    }

    return {
      accepted: accepted.length,
      rejected: rejected.length,
      errors,
    };
  }

  async getLocationHistory(query: LocationQueryDto): Promise<LocationPointResponseDto[]> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: query.tripId },
      select: { id: true },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const where: any = { tripId: query.tripId };

    if (query.from || query.to) {
      where.capturedAt = {};
      if (query.from) where.capturedAt.gte = new Date(query.from);
      if (query.to) where.capturedAt.lte = new Date(query.to);
    }

    const points = await this.prisma.locationPoint.findMany({
      where,
      orderBy: { capturedAt: 'asc' },
      take: query.limit ?? 100,
    });

    return points.map(p => ({
      id: p.id,
      tripId: p.tripId,
      latitude: p.latitude,
      longitude: p.longitude,
      speedKmh: p.speedKmh,
      accuracyMeters: p.accuracyMeters,
      capturedAt: p.capturedAt,
      receivedAt: p.receivedAt,
      source: p.source,
    }));
  }

  async getLatestLocation(tripId: string): Promise<LocationPointResponseDto | null> {
    const point = await this.prisma.locationPoint.findFirst({
      where: { tripId },
      orderBy: { capturedAt: 'desc' },
    });

    if (!point) return null;

    return {
      id: point.id,
      tripId: point.tripId,
      latitude: point.latitude,
      longitude: point.longitude,
      speedKmh: point.speedKmh,
      accuracyMeters: point.accuracyMeters,
      capturedAt: point.capturedAt,
      receivedAt: point.receivedAt,
      source: point.source,
    };
  }

  async getTripTrackingStatus(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        status: true,
        activeDriverId: true,
        startedAt: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const latestLocation = await this.getLatestLocation(tripId);
    const now = new Date();

    let status: 'LIVE' | 'STALE' | 'NO_DATA';
    if (!latestLocation) {
      status = 'NO_DATA';
    } else {
      const ageMinutes = (now.getTime() - latestLocation.capturedAt.getTime()) / (1000 * 60);
      status = ageMinutes <= 2 ? 'LIVE' : 'STALE';
    }

    return {
      tripId,
      status: trip.status,
      activeDriverId: trip.activeDriverId,
      startedAt: trip.startedAt,
      latestLocation,
      trackingStatus: status,
    };
  }
}
