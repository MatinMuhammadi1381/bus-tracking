import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { BusEntity } from './bus.entity';
import { BusStatus } from '@bus-tracking/shared-types';

@Injectable()
export class BusesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBusDto): Promise<BusEntity> {
    const existing = await this.prisma.bus.findFirst({
      where: {
        OR: [
          { plateNumber: dto.plateNumber },
          ...(dto.fleetNumber ? [{ fleetNumber: dto.fleetNumber }] : []),
          ...(dto.busCode ? [{ busCode: dto.busCode }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        'Bus with this plate number, fleet number, or bus code already exists'
      );
    }

    const bus = await this.prisma.bus.create({
      data: {
        displayName: dto.displayName,
        model: dto.model,
        manufactureYear: dto.manufactureYear,
        color: dto.color,
        plateNumber: dto.plateNumber,
        fleetNumber: dto.fleetNumber,
        busCode: dto.busCode,
        seatCount: dto.seatCount,
        status: 'ACTIVE',
      },
    });

    return new BusEntity(bus);
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: BusStatus;
  }): Promise<{ data: BusEntity[]; total: number }> {
    const { page, limit, search, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { plateNumber: { contains: search, mode: 'insensitive' } },
        { fleetNumber: { contains: search, mode: 'insensitive' } },
        { busCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.bus.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bus.count({ where }),
    ]);

    return { data: data.map((b: any) => new BusEntity(b)), total };
  }

  async findById(id: string): Promise<BusEntity> {
    const bus = await this.prisma.bus.findUnique({ where: { id } });
    if (!bus) {
      throw new NotFoundException('Bus not found');
    }
    return new BusEntity(bus);
  }

  async update(id: string, dto: UpdateBusDto): Promise<BusEntity> {
    await this.findById(id);

    if (dto.plateNumber || dto.fleetNumber || dto.busCode) {
      const existing = await this.prisma.bus.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(dto.plateNumber ? [{ plateNumber: dto.plateNumber }] : []),
                ...(dto.fleetNumber ? [{ fleetNumber: dto.fleetNumber }] : []),
                ...(dto.busCode ? [{ busCode: dto.busCode }] : []),
              ],
            },
          ],
        },
      });

      if (existing) {
        throw new ConflictException(
          'Bus with this plate number, fleet number, or bus code already exists'
        );
      }
    }

    const bus = await this.prisma.bus.update({
      where: { id },
      data: dto,
    });

    return new BusEntity(bus);
  }

  async updateStatus(id: string, status: BusStatus): Promise<BusEntity> {
    await this.findById(id);
    const bus = await this.prisma.bus.update({
      where: { id },
      data: { status },
    });
    return new BusEntity(bus);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.bus.delete({ where: { id } });
  }
}
