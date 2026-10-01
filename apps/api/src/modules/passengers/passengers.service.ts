import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePassengerDto } from './dto/create-passenger.dto';
import { UpdatePassengerDto } from './dto/update-passenger.dto';
import { PassengerEntity } from './passenger.entity';

@Injectable()
export class PassengersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePassengerDto): Promise<PassengerEntity> {
    const passenger = await this.prisma.passenger.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        passengerCode: dto.passengerCode,
        gender: dto.gender,
      },
    });

    return new PassengerEntity(passenger);
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ data: PassengerEntity[]; total: number }> {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.passenger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.passenger.count({ where }),
    ]);

    return { data: data.map((p: any) => new PassengerEntity(p)), total };
  }

  async findById(id: string): Promise<PassengerEntity> {
    const passenger = await this.prisma.passenger.findUnique({ where: { id } });
    if (!passenger) {
      throw new NotFoundException('Passenger not found');
    }
    return new PassengerEntity(passenger);
  }

  async update(id: string, dto: UpdatePassengerDto): Promise<PassengerEntity> {
    await this.findById(id);

    const passenger = await this.prisma.passenger.update({
      where: { id },
      data: dto,
    });

    return new PassengerEntity(passenger);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.passenger.delete({ where: { id } });
  }

  async findByTrip(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { bus: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    const links = await this.prisma.tripPassenger.findMany({
      where: { tripId },
      include: { passenger: true },
      orderBy: { createdAt: 'asc' },
    });
    return links.map(link => ({
      ...link.passenger,
      tripPassengerId: link.id,
      seatNumber: link.seatNumber,
    }));
  }

  async addToTrip(tripId: string, dto: CreatePassengerDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const passenger = await this.prisma.passenger.create({ data: dto });
    try {
      await this.prisma.tripPassenger.create({
        data: { tripId, passengerId: passenger.id },
      });
    } catch (error) {
      await this.prisma.passenger.delete({ where: { id: passenger.id } });
      throw error;
    }
    return passenger;
  }

  async assignSeat(tripId: string, passengerId: string, seatNumber: number) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { bus: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > trip.bus.seatCount) {
      throw new BadRequestException(`Seat number must be between 1 and ${trip.bus.seatCount}`);
    }
    const passenger = await this.prisma.passenger.findUnique({ where: { id: passengerId } });
    if (!passenger) throw new NotFoundException('Passenger not found');
    const link = await this.prisma.tripPassenger.findUnique({
      where: { tripId_passengerId: { tripId, passengerId } },
    });
    if (!link) throw new NotFoundException('Passenger is not assigned to this trip');
    const occupied = await this.prisma.tripPassenger.findFirst({
      where: { tripId, seatNumber, passengerId: { not: passengerId } },
    });
    if (occupied) throw new ConflictException('This seat is already assigned');
    return this.prisma.tripPassenger.update({
      where: { id: link.id },
      data: { seatNumber },
      include: { passenger: true },
    });
  }

  async unassignSeat(tripId: string, passengerId: string) {
    const link = await this.prisma.tripPassenger.findUnique({
      where: { tripId_passengerId: { tripId, passengerId } },
    });
    if (!link) throw new NotFoundException('Passenger is not assigned to this trip');
    return this.prisma.tripPassenger.update({
      where: { id: link.id },
      data: { seatNumber: null },
      include: { passenger: true },
    });
  }
  async updateInTrip(tripId: string, passengerId: string, dto: UpdatePassengerDto) {
    const link = await this.prisma.tripPassenger.findUnique({
      where: { tripId_passengerId: { tripId, passengerId } },
    });
    if (!link) throw new NotFoundException('Passenger is not assigned to this trip');
    return this.prisma.passenger.update({ where: { id: passengerId }, data: dto });
  }

  async removeFromTrip(tripId: string, passengerId: string): Promise<void> {
    const link = await this.prisma.tripPassenger.findUnique({
      where: { tripId_passengerId: { tripId, passengerId } },
    });
    if (!link) throw new NotFoundException('Passenger is not assigned to this trip');
    await this.prisma.tripPassenger.delete({ where: { id: link.id } });
  }
}
