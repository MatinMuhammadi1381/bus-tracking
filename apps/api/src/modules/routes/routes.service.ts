import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { RouteEntity } from './route.entity';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRouteDto): Promise<RouteEntity> {
    const existing = await this.prisma.route.findFirst({
      where: {
        origin: dto.origin,
        destination: dto.destination,
      },
    });

    if (existing) {
      throw new ConflictException('Route with this origin and destination already exists');
    }

    const route = await this.prisma.route.create({
      data: {
        origin: dto.origin,
        destination: dto.destination,
        geometry: dto.geometry,
        totalDistanceKm: dto.totalDistanceKm,
        estimatedDurationMinutes: dto.estimatedDurationMinutes,
        routingMetadata: dto.routingMetadata,
      },
    });

    return new RouteEntity(route);
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ data: RouteEntity[]; total: number }> {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { origin: { contains: search, mode: 'insensitive' as const } },
            { destination: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.route.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.route.count({ where }),
    ]);

    return { data: data.map((r: any) => new RouteEntity(r)), total };
  }

  async findById(id: string): Promise<RouteEntity> {
    const route = await this.prisma.route.findUnique({ where: { id } });
    if (!route) {
      throw new NotFoundException('Route not found');
    }
    return new RouteEntity(route);
  }

  async update(id: string, dto: UpdateRouteDto): Promise<RouteEntity> {
    await this.findById(id);

    if (dto.origin && dto.destination) {
      const existing = await this.prisma.route.findFirst({
        where: {
          AND: [{ id: { not: id } }, { origin: dto.origin, destination: dto.destination }],
        },
      });

      if (existing) {
        throw new ConflictException('Route with this origin and destination already exists');
      }
    }

    const route = await this.prisma.route.update({
      where: { id },
      data: dto,
    });

    return new RouteEntity(route);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.route.delete({ where: { id } });
  }
}
