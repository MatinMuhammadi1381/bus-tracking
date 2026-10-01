import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripDriverConfirmDto } from './dto/trip-driver-confirm.dto';
import { TripHandoverDto } from './dto/trip-handover.dto';
import { TripEntity } from './trip.entity';
import {
  TripStatus,
  PassengerCountStatus,
  AssignmentOrder,
  HandoverSource,
} from '@bus-tracking/shared-types';
import {
  validateTransition,
  runTransitionValidators,
  getNextStatusAfterConfirmation,
  isTerminalStatus,
} from './trip-state-machine';

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTripDto): Promise<TripEntity> {
    // Verify bus exists and is active
    const bus = await this.prisma.bus.findUnique({ where: { id: dto.busId } });
    if (!bus) throw new NotFoundException('Bus not found');
    if (bus.status !== 'ACTIVE') throw new BadRequestException('Bus is not active');

    // Verify route exists
    const route = await this.prisma.route.findUnique({ where: { id: dto.routeId } });
    if (!route) throw new NotFoundException('Route not found');

    // Verify both drivers exist and are active
    const drivers = await this.prisma.driver.findMany({
      where: { id: { in: dto.driverIds } },
    });
    if (drivers.length !== 2) throw new NotFoundException('One or both drivers not found');
    if (drivers.some((d: any) => d.status !== 'ACTIVE'))
      throw new BadRequestException('One or both drivers are not active');

    // Check if drivers already have active trips
    const activeTrips = await this.prisma.trip.findMany({
      where: {
        activeDriverId: { in: dto.driverIds },
        status: { in: ['IN_PROGRESS', 'READY', 'PENDING_DRIVER_CONFIRMATION'] },
      },
    });
    if (activeTrips.length > 0) {
      throw new ConflictException('One or both drivers already have an active trip');
    }

    // Check if bus has active trip
    const busActiveTrip = await this.prisma.trip.findFirst({
      where: {
        busId: dto.busId,
        status: { in: ['IN_PROGRESS', 'READY', 'PENDING_DRIVER_CONFIRMATION'] },
      },
    });
    if (busActiveTrip) {
      throw new ConflictException('Bus already has an active trip');
    }

    // Create trip with driver assignments
    const trip = await this.prisma.trip.create({
      data: {
        activeDriverId: dto.driverIds[0],
        busId: dto.busId,
        routeId: dto.routeId,
        expectedPassengerCount: dto.expectedPassengerCount,
        departureDate: dto.departureDate,
        departureTime: dto.departureTime,
        confirmedPassengerCount: 0,
        passengerCountStatus: 'PENDING',
        status: 'ASSIGNED',
        driverAssignments: {
          create: dto.driverIds.map((driverId, index) => ({
            driver: { connect: { id: driverId } },
            assignmentOrder: index === 0 ? 'FIRST' : 'SECOND',
          })),
        },
        trackingLink: {
          create: {
            secureToken: randomUUID(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: {
        driverAssignments: true,
      },
    });

    return new TripEntity(trip);
  }

  async update(id: string, dto: UpdateTripDto): Promise<TripEntity> {
    const existingTrip = await this.prisma.trip.findUnique({
      where: { id },
    });
    if (!existingTrip) throw new NotFoundException('Trip not found');

    const updatedTrip = await this.prisma.trip.update({
      where: { id },
      data: {
        ...(dto.expectedPassengerCount !== undefined
          ? { expectedPassengerCount: dto.expectedPassengerCount }
          : {}),
        ...(dto.departureDate !== undefined ? { departureDate: dto.departureDate } : {}),
        ...(dto.departureTime !== undefined ? { departureTime: dto.departureTime } : {}),
      },
    });

    return this.findById(updatedTrip.id);
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: TripStatus;
  }): Promise<{ data: TripEntity[]; total: number }> {
    const { page, limit, search, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { bus: { displayName: { contains: search, mode: 'insensitive' } } },
        { bus: { plateNumber: { contains: search, mode: 'insensitive' } } },
        { route: { origin: { contains: search, mode: 'insensitive' } } },
        { route: { destination: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          bus: true,
          route: true,
          activeDriver: true,
          driverAssignments: { include: { driver: true } },
          trackingLink: true,
          passengers: { include: { passenger: true } },
          confirmations: { include: { driver: true }, orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    return {
      data: data.map((t: any) => this.toTripEntity(t)),
      total,
    };
  }

  async findById(id: string): Promise<TripEntity> {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        bus: true,
        route: true,
        activeDriver: true,
        driverAssignments: { include: { driver: true } },
        handovers: { include: { previousDriver: true, nextDriver: true } },
        trackingLink: true,
        confirmations: { include: { driver: true }, orderBy: { createdAt: 'asc' } },
        passengers: { include: { passenger: true } },
      },
    });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    return this.toTripEntity(trip);
  }

  async ensureTrackingLink(tripId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    const existing = await this.prisma.trackingLink.findUnique({ where: { tripId } });
    if (existing) return existing;
    return this.prisma.trackingLink.create({
      data: {
        tripId,
        secureToken: randomUUID(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async findActiveTripByDriver(driverId: string): Promise<TripEntity | null> {
    const trip = await this.prisma.trip.findFirst({
      where: {
        OR: [
          { activeDriverId: driverId },
          { driverAssignments: { some: { driverId } } },
        ],
        status: { in: ['IN_PROGRESS', 'READY'] },
      },
      include: {
        bus: true,
        route: true,
        activeDriver: true,
        driverAssignments: { include: { driver: true } },
        trackingLink: true,
        passengers: { include: { passenger: true } },
      },
    });
    return trip ? new TripEntity(trip) : null;
  }

  async findAssignedTripsByDriver(driverId: string): Promise<TripEntity[]> {
    const trips = await this.prisma.trip.findMany({
      where: {
        driverAssignments: { some: { driverId } },
        status: { in: ['ASSIGNED', 'PENDING_DRIVER_CONFIRMATION'] },
      },
      include: {
        bus: true,
        route: true,
        activeDriver: true,
        driverAssignments: { include: { driver: true } },
        trackingLink: true,
        confirmations: true,
        passengers: { include: { passenger: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return trips.map((t: any) => new TripEntity(t));
  }

  async findTripHistoryByDriver(driverId: string): Promise<TripEntity[]> {
    const trips = await this.prisma.trip.findMany({
      where: {
        OR: [
          { driverAssignments: { some: { driverId } } },
          { confirmations: { some: { driverId } } },
        ],
        status: { in: ['COMPLETED', 'CANCELLED'] },
      },
      include: {
        bus: true,
        route: true,
        activeDriver: true,
        driverAssignments: { include: { driver: true } },
        trackingLink: true,
        confirmations: true,
        passengers: { include: { passenger: true } },
      },
      orderBy: { completedAt: 'desc' },
    });
    return trips.map((trip: any) => new TripEntity(trip));
  }

  async driverConfirm(
    tripId: string,
    driverId: string,
    dto: TripDriverConfirmDto
  ): Promise<TripEntity> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { driverAssignments: true },
    });

    if (!trip) throw new NotFoundException('Trip not found');

    // Verify driver is assigned to this trip
    const assignment = trip.driverAssignments.find((a: any) => a.driverId === driverId);
    if (!assignment) throw new ForbiddenException('Driver not assigned to this trip');

    // Check trip status
    if (trip.status !== 'ASSIGNED' && trip.status !== 'PENDING_DRIVER_CONFIRMATION') {
      throw new BadRequestException('Trip is not in a state where driver confirmation is allowed');
    }

    // Prevent driver from confirming twice
    const existingConfirmations = await this.prisma.driverConfirmation.findMany({
      where: { tripId, driverId },
    });
    if (existingConfirmations.length > 0) {
      throw new BadRequestException('Driver has already confirmed this trip');
    }

    // Record the confirmation
    await this.prisma.driverConfirmation.create({
      data: {
        tripId,
        driverId,
        confirmedPassengerCount: dto.confirmedPassengerCount,
      },
    });

    // Get all confirmations for this trip
    const allConfirmations = await this.prisma.driverConfirmation.findMany({
      where: { tripId },
      include: { driver: true },
    });

    const assignedDriverIds = trip.driverAssignments.map((a: any) => a.driverId);
    const confirmedDriverIds = allConfirmations.map((c: any) => c.driverId);
    const allConfirmed = assignedDriverIds.every((id: string) => confirmedDriverIds.includes(id));

    // Determine next status
    const nextStatus = getNextStatusAfterConfirmation(trip.status, allConfirmed);

    // Validate transition
    validateTransition(trip.status, nextStatus, 'DRIVER', allConfirmed);
    await runTransitionValidators(trip, { sub: driverId }, nextStatus, dto);

    // Update confirmed passenger count
    const confirmedPassengerCount = dto.confirmedPassengerCount;
    const passengerCountStatus =
      confirmedPassengerCount === trip.expectedPassengerCount ? 'CONFIRMED' : 'DISCREPANCY';

    const updatedTrip = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        confirmedPassengerCount,
        passengerCountStatus,
        status: nextStatus,
        ...(allConfirmed
          ? {
              activeDriverId: trip.driverAssignments.find((a: any) => a.assignmentOrder === 'FIRST')
                ?.driverId,
            }
          : {}),
      },
      include: {
        bus: true,
        route: true,
        activeDriver: true,
        driverAssignments: { include: { driver: true } },
        trackingLink: true,
        confirmations: { include: { driver: true }, orderBy: { createdAt: 'asc' } },
        passengers: { include: { passenger: true } },
      },
    });

    return this.toTripEntity(updatedTrip);
  }

  async startTrip(tripId: string, driverId: string): Promise<TripEntity> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { driverAssignments: true },
    });

    if (!trip) throw new NotFoundException('Trip not found');

    // Verify driver is the active driver
    if (trip.activeDriverId !== driverId) {
      throw new ForbiddenException('Only the active driver can start the trip');
    }

    // Check trip status
    if (trip.status !== 'READY') {
      throw new BadRequestException('Trip is not ready to start');
    }

    // Check if GPS is available (would be validated at tracking ingestion)
    // For now, just check if there's an active device
    const activeDevice = await this.prisma.driverDevice.findFirst({
      where: {
        driverId,
        provisioningStatus: 'PROVISIONED',
        sessionStatus: 'ACTIVE',
      },
    });
    if (!activeDevice) {
      throw new BadRequestException('No active provisioned device for GPS tracking');
    }

    const updatedTrip = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: {
        bus: true,
        route: true,
        activeDriver: true,
        driverAssignments: { include: { driver: true } },
        trackingLink: true,
      },
    });

    return new TripEntity(updatedTrip);
  }

  async endTrip(tripId: string, driverId: string): Promise<TripEntity> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) throw new NotFoundException('Trip not found');

    // Verify driver is the active driver
    if (trip.activeDriverId !== driverId) {
      throw new ForbiddenException('Only the active driver can end the trip');
    }

    // Check trip status
    if (trip.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Trip is not in progress');
    }

    const updatedTrip = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        activeDriverId: null,
      },
      include: {
        bus: true,
        route: true,
        activeDriver: true,
        driverAssignments: { include: { driver: true } },
        trackingLink: true,
      },
    });

    return new TripEntity(updatedTrip);
  }

  async handover(tripId: string, driverId: string, dto: TripHandoverDto): Promise<TripEntity> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { driverAssignments: true },
    });

    if (!trip) throw new NotFoundException('Trip not found');

    // Verify current driver is the active driver
    if (trip.activeDriverId !== driverId) {
      throw new ForbiddenException('Only the active driver can initiate handover');
    }

    // Verify next driver is assigned to this trip
    const nextAssignment = trip.driverAssignments.find((a: any) => a.driverId === dto.nextDriverId);
    if (!nextAssignment) {
      throw new ForbiddenException('Next driver is not assigned to this trip');
    }

    // Check trip status
    if (trip.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Handover only allowed during active trip');
    }

    // Perform handover in transaction
    const result = await this.prisma.$transaction(async (tx: any) => {
      // Update trip with new active driver
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          activeDriverId: dto.nextDriverId,
        },
        include: {
          bus: true,
          route: true,
          activeDriver: true,
          driverAssignments: { include: { driver: true } },
          trackingLink: true,
        },
      });

      // Create handover record
      await tx.tripDriverHandover.create({
        data: {
          tripId,
          previousDriverId: driverId,
          nextDriverId: dto.nextDriverId,
          changedBy: 'DRIVER',
          sourceMetadata: { initiatedBy: 'driver_app' },
        },
      });

      return updatedTrip;
    });

    return new TripEntity(result);
  }

  async supportCancel(tripId: string): Promise<TripEntity> {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
      throw new BadRequestException('Trip is already completed or cancelled');
    }

    const updatedTrip = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        activeDriverId: null,
      },
      include: {
        bus: true,
        route: true,
        activeDriver: true,
        driverAssignments: { include: { driver: true } },
        trackingLink: true,
      },
    });

    return new TripEntity(updatedTrip);
  }

  async delete(id: string): Promise<void> {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Trip not found');

    await this.prisma.trip.delete({ where: { id } });
  }

  private toTripEntity(trip: any): TripEntity {
    const confirmations = trip.confirmations || [];
    const assignedDriverCount = trip.driverAssignments?.length || 0;
    const driverConfirmationCount = confirmations.length;
    return new TripEntity({
      ...trip,
      driverConfirmationCount,
      assignedDriverCount,
      driverConfirmationStatus:
        assignedDriverCount > 0 && driverConfirmationCount >= assignedDriverCount
          ? 'تایید همه رانندگان'
          : `تایید ${driverConfirmationCount} از ${assignedDriverCount} راننده`,
    });
  }
}
