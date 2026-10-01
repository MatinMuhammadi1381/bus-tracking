import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as argon2 from 'argon2';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverEntity } from './driver.entity';
import { DriverStatus } from '@bus-tracking/shared-types';
import { normalizeDriverPhone } from './phone.util';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDriverDto): Promise<DriverEntity> {
    const existing = await this.prisma.driver.findUnique({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException('Driver with this phone already exists');
    }

    const passwordHash = await argon2.hash(dto.password);

    const driver = await this.prisma.driver.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: normalizeDriverPhone(dto.phone),
        passwordHash,
        passwordPreview: dto.password,
        status: 'ACTIVE',
      },
    });

    return new DriverEntity(driver);
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ data: DriverEntity[]; total: number }> {
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
      this.prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driver.count({ where }),
    ]);

    return { data: data.map((d: any) => new DriverEntity(d)), total };
  }

  async findById(id: string): Promise<DriverEntity> {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }
    return new DriverEntity(driver);
  }

  async findByPhone(phone: string): Promise<DriverEntity | null> {
    const driver = await this.prisma.driver.findUnique({ where: { phone } });
    return driver ? new DriverEntity(driver) : null;
  }

  async update(id: string, dto: UpdateDriverDto): Promise<DriverEntity> {
    await this.findById(id);

    const driver = await this.prisma.driver.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ? normalizeDriverPhone(dto.phone) : undefined,
        // status is not in UpdateDriverDto, handled separately
      },
    });

    return new DriverEntity(driver);
  }

  async updateProfilePhoto(id: string, profilePhotoUrl: string | null): Promise<DriverEntity> {
    await this.findById(id);
    const driver = await this.prisma.driver.update({
      where: { id },
      data: { profilePhotoUrl },
    });
    return new DriverEntity(driver);
  }

  async updatePassword(
    id: string,
    currentPassword: string | undefined,
    newPassword: string
  ): Promise<DriverEntity> {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }
    if (
      currentPassword !== undefined &&
      !(await argon2.verify(driver.passwordHash, currentPassword))
    ) {
      throw new ConflictException('Current password is incorrect');
    }
    const passwordHash = await argon2.hash(newPassword);
    const updatedDriver = await this.prisma.driver.update({
      where: { id },
      data: { passwordHash, passwordPreview: newPassword },
    });
    return new DriverEntity(updatedDriver);
  }

  async updateStatus(id: string, status: DriverStatus): Promise<DriverEntity> {
    await this.findById(id);
    const driver = await this.prisma.driver.update({
      where: { id },
      data: { status },
    });
    return new DriverEntity(driver);
  }

  async setRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    await this.prisma.driver.update({
      where: { id },
      data: { refreshToken },
    });
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.driver.delete({ where: { id } });
  }
}
