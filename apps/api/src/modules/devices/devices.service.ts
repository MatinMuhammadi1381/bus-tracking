import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProvisionDeviceDto } from './dto/provision-device.dto';
import { DeviceEntity } from './device.entity';
import { ProvisioningStatus, SessionStatus } from '@bus-tracking/shared-types';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async provision(dto: ProvisionDeviceDto): Promise<DeviceEntity> {
    const driver = await this.prisma.driver.findUnique({ where: { id: dto.driverId } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Check if driver already has an active provisioned device
    const existingActive = await this.prisma.driverDevice.findFirst({
      where: {
        driverId: dto.driverId,
        provisioningStatus: 'PROVISIONED',
        sessionStatus: 'ACTIVE',
      },
    });

    if (existingActive && existingActive.deviceIdentifier !== dto.deviceIdentifier) {
      throw new ConflictException('Driver already has an active provisioned device');
    }

    const device = await this.prisma.driverDevice.upsert({
      where: {
        driverId_deviceIdentifier: {
          driverId: dto.driverId,
          deviceIdentifier: dto.deviceIdentifier,
        },
      },
      update: {
        provisioningStatus: 'PROVISIONED',
        sessionStatus: 'ACTIVE',
        revokedAt: null,
        lastHeartbeatAt: new Date(),
      },
      create: {
        driverId: dto.driverId,
        deviceIdentifier: dto.deviceIdentifier,
        provisioningStatus: 'PROVISIONED',
        sessionStatus: 'ACTIVE',
      },
    });

    return new DeviceEntity(device);
  }

  async revoke(driverId: string, deviceIdentifier: string): Promise<DeviceEntity> {
    const device = await this.prisma.driverDevice.findUnique({
      where: { driverId_deviceIdentifier: { driverId, deviceIdentifier } },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const updated = await this.prisma.driverDevice.update({
      where: { id: device.id },
      data: {
        provisioningStatus: 'REVOKED',
        sessionStatus: 'INACTIVE',
        revokedAt: new Date(),
      },
    });

    return new DeviceEntity(updated);
  }

  async getByDriver(driverId: string): Promise<DeviceEntity[]> {
    const devices = await this.prisma.driverDevice.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    });
    return devices.map((d: any) => new DeviceEntity(d));
  }

  async getActiveDevice(driverId: string): Promise<DeviceEntity | null> {
    const device = await this.prisma.driverDevice.findFirst({
      where: {
        driverId,
        provisioningStatus: 'PROVISIONED',
        sessionStatus: 'ACTIVE',
      },
    });
    return device ? new DeviceEntity(device) : null;
  }

  async updateHeartbeat(deviceIdentifier: string): Promise<void> {
    await this.prisma.driverDevice.updateMany({
      where: { deviceIdentifier },
      data: { lastHeartbeatAt: new Date() },
    });
  }

  async updateSessionStatus(
    driverId: string,
    deviceIdentifier: string,
    sessionStatus: SessionStatus
  ): Promise<DeviceEntity | null> {
    const device = await this.prisma.driverDevice.update({
      where: { driverId_deviceIdentifier: { driverId, deviceIdentifier } },
      data: { sessionStatus },
    });
    return device ? new DeviceEntity(device) : null;
  }

  async verifyDevice(driverId: string, deviceIdentifier: string): Promise<DeviceEntity> {
    const device = await this.prisma.driverDevice.findUnique({
      where: { driverId_deviceIdentifier: { driverId, deviceIdentifier } },
    });

    if (!device) {
      throw new NotFoundException('Device not found for this driver');
    }

    if (device.provisioningStatus !== 'PROVISIONED') {
      throw new ForbiddenException('Device is not provisioned');
    }

    if (device.sessionStatus !== 'ACTIVE') {
      throw new ForbiddenException('Device session is not active');
    }

    return new DeviceEntity(device);
  }
}
