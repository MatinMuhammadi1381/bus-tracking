import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  PublicTrackingDto,
  PublicTrackingQueryDto,
  PublicTripResponseDto,
  PublicLocationPointDto,
} from './dto/public-tracking.dto';
import { TripStatus } from '@bus-tracking/shared-types';

@Injectable()
export class PublicTrackingService {
  private readonly verificationAttempts = new Map<string, { count: number; resetAt: number }>();

  constructor(private prisma: PrismaService) {}

  async getTripByToken(dto: PublicTrackingDto): Promise<PublicTripResponseDto> {
    const trackingLink = await this.prisma.trackingLink.findUnique({
      where: { secureToken: dto.token },
      include: {
        trip: {
          include: {
            bus: true,
            route: true,
            activeDriver: true,
            passengers: { select: { seatNumber: true, passenger: { select: { gender: true } } } },
          },
        },
      },
    });

    if (!trackingLink) {
      throw new NotFoundException('Invalid or expired tracking link');
    }

    if (trackingLink.status !== 'ACTIVE') {
      throw new ForbiddenException('Tracking link is not active');
    }

    if (trackingLink.expiresAt < new Date()) {
      throw new ForbiddenException('Tracking link has expired');
    }

    return this.buildPublicTripResponse(trackingLink.trip);
  }

  async getLocationHistory(dto: PublicTrackingQueryDto): Promise<PublicLocationPointDto[]> {
    const trackingLink = await this.prisma.trackingLink.findUnique({
      where: { secureToken: dto.token },
      include: { trip: true },
    });

    if (!trackingLink) {
      throw new NotFoundException('Invalid or expired tracking link');
    }

    if (trackingLink.status !== 'ACTIVE') {
      throw new ForbiddenException('Tracking link is not active');
    }

    if (trackingLink.expiresAt < new Date()) {
      throw new ForbiddenException('Tracking link has expired');
    }

    const where: any = { tripId: trackingLink.tripId };
    const points = await this.prisma.locationPoint.findMany({
      where,
      orderBy: { capturedAt: 'desc' },
      take: dto.limit ?? 100,
    });

    return points.map(p => ({
      latitude: p.latitude,
      longitude: p.longitude,
      speedKmh: p.speedKmh,
      accuracyMeters: p.accuracyMeters,
      capturedAt: p.capturedAt,
      status: this.getLocationStatus(p),
    }));
  }

  async verifyPassengerForTrip(token: string, passengerId: string) {
    const now = Date.now();
    const attempt = this.verificationAttempts.get(token);
    if (attempt && attempt.resetAt > now && attempt.count >= 5) {
      throw new HttpException(
        'تعداد تلاش‌ها بیش از حد مجاز است. بعداً دوباره تلاش کنید.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    const nextAttempt =
      attempt && attempt.resetAt > now
        ? { count: attempt.count + 1, resetAt: attempt.resetAt }
        : { count: 1, resetAt: now + 5 * 60 * 1000 };
    this.verificationAttempts.set(token, nextAttempt);

    const trackingLink = await this.prisma.trackingLink.findUnique({
      where: { secureToken: token },
      include: {
        trip: {
          include: {
            activeDriver: true,
            passengers: { where: { passenger: { passengerCode: passengerId } } },
          },
        },
      },
    });

    if (
      !trackingLink ||
      trackingLink.status !== 'ACTIVE' ||
      trackingLink.expiresAt < new Date() ||
      trackingLink.trip.passengers.length === 0 ||
      !trackingLink.trip.activeDriver
    ) {
      throw new ForbiddenException('شناسه مسافر معتبر نیست.');
    }

    const driver = trackingLink.trip.activeDriver;
    this.verificationAttempts.delete(token);
    return {
      driver: {
        firstName: driver.firstName,
        lastName: driver.lastName,
        phone: driver.phone,
        profilePhotoUrl: driver.profilePhotoUrl,
      },
    };
  }

  private async buildPublicTripResponse(trip: any): Promise<any> {
    const latestLocation = await this.getLatestLocation(trip.id);
    const activeDriver = trip.activeDriver;
    const bus = trip.bus;
    const route = trip.route;
    const assignedPassengerCount = trip.passengers.length;

    return {
      tripId: trip.id,
      status: trip.status,
      origin: route.origin,
      destination: route.destination,
      route: {
        geometry: route.geometry,
      },
      bus: {
        displayName: bus.displayName,
        plateNumber: bus.plateNumber,
        busCode: bus.busCode,
        seatCount: bus.seatCount,
      },
      occupiedSeats: trip.passengers
        .filter((passenger: any) => passenger.seatNumber !== null)
        .map((passenger: any) => ({
          seatNumber: passenger.seatNumber,
          gender: passenger.passenger.gender,
        })),
      activeDriver: activeDriver
        ? {
            firstName: activeDriver.firstName,
            lastName: activeDriver.lastName,
          }
        : null,
      passengerCount: assignedPassengerCount,
      expectedPassengerCount: trip.expectedPassengerCount,
      departureDate: trip.departureDate,
      departureTime: trip.departureTime,
      confirmedPassengerCount: assignedPassengerCount,
      currentLocation: latestLocation
        ? {
            latitude: latestLocation.latitude,
            longitude: latestLocation.longitude,
            speedKmh: latestLocation.speedKmh,
            capturedAt: latestLocation.capturedAt,
            status: this.getLocationStatus(latestLocation),
          }
        : null,
      etaMinutes: latestLocation ? await this.calculateETA(latestLocation, trip) : null,
      startedAt: trip.startedAt,
      completedAt: trip.completedAt,
    };
  }

  private async getLatestLocation(tripId: string) {
    return this.prisma.locationPoint.findFirst({
      where: { tripId },
      orderBy: { capturedAt: 'desc' },
    });
  }

  private getLocationStatus(location: any): 'LIVE' | 'PREDICTED' | 'LAST_KNOWN' | 'STALE' {
    const now = new Date();
    const ageMinutes = (now.getTime() - location.capturedAt.getTime()) / (1000 * 60);

    if (ageMinutes <= 1) return 'LIVE';
    if (ageMinutes <= 5) return 'LAST_KNOWN';
    if (ageMinutes <= 30) return 'PREDICTED';
    return 'STALE';
  }

  private async calculateETA(location: any, trip: any): Promise<number | null> {
    if (!trip.route?.totalDistanceKm || !location.speedKmh) return null;

    const totalDistance = trip.route.totalDistanceKm;
    const traveledDistance = await this.estimateTraveledDistance(trip.id, location);
    const remainingDistance = Math.max(0, totalDistance - traveledDistance);

    if (location.speedKmh <= 0) return null;

    return Math.round((remainingDistance / location.speedKmh) * 60);
  }

  private async estimateTraveledDistance(tripId: string, latestLocation: any): Promise<number> {
    // Simplified estimation - in production would use route matching
    return 0;
  }
}
