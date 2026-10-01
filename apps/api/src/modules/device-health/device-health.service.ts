import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DeviceHealthDto, DeviceHealthQueryDto } from './dto/device-health.dto';

@Injectable()
export class DeviceHealthService {
  constructor(private prisma: PrismaService) {}

  async ingestHealth(dto: DeviceHealthDto & { driverId: string }) {
    let driverDeviceId = dto.driverDeviceId;
    if (!driverDeviceId) {
      const device = await this.prisma.driverDevice.findFirst({
        where: { driverId: dto.driverId, revokedAt: null },
        orderBy: { updatedAt: 'desc' },
      });
      if (device) {
        driverDeviceId = device.id;
      } else {
        const device = await this.prisma.driverDevice.create({
          data: {
            driverId: dto.driverId,
            deviceIdentifier: `driver-${dto.driverId}`,
            provisioningStatus: 'PROVISIONED',
            sessionStatus: 'ACTIVE',
          },
        });
        driverDeviceId = device.id;
      }
    }

    const device = await this.prisma.driverDevice.findUnique({
      where: { id: driverDeviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (dto.tripId) {
      const trip = await this.prisma.trip.findUnique({
        where: { id: dto.tripId },
        select: { id: true, activeDriverId: true, status: true },
      });

      if (!trip) {
        throw new BadRequestException('Trip not found');
      }
    }

    const health = await this.prisma.deviceHealth.create({
      data: {
        driverDeviceId,
        tripId: dto.tripId,
        gpsStatus: dto.gpsStatus,
        permissionStatus: dto.permissionStatus,
        connectivityStatus: dto.connectivityStatus,
        trackingStatus: dto.trackingStatus,
        batteryLevel: dto.batteryLevel,
        batteryState: dto.batteryState,
        appVersion: dto.appVersion,
        osVersion: dto.osVersion,
        deviceModel: dto.deviceModel,
        observedAt: new Date(),
      },
    });

    // Also update the device's last heartbeat
    await this.prisma.driverDevice.update({
      where: { id: driverDeviceId },
      data: { lastHeartbeatAt: new Date() },
    });

    return health;
  }

  async getHealthHistory(query: DeviceHealthQueryDto) {
    const where: any = { driverDeviceId: query.driverDeviceId };

    if (query.tripId) {
      where.tripId = query.tripId;
    }

    const records = await this.prisma.deviceHealth.findMany({
      where,
      orderBy: { observedAt: 'desc' },
      take: query.limit ?? 100,
    });

    return records;
  }

  async getLatestHealth(driverDeviceId: string, tripId?: string) {
    const where: any = { driverDeviceId };
    if (tripId) where.tripId = tripId;

    return this.prisma.deviceHealth.findFirst({
      where,
      orderBy: { observedAt: 'desc' },
    });
  }

  async getLatestHealthForAll() {
    const devices = await this.prisma.driverDevice.findMany({
      include: {
        driver: { select: { firstName: true, lastName: true, phone: true } },
        healthRecords: {
          orderBy: { observedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      total: devices.length,
      data: devices.map(device => {
        const latest = device.healthRecords[0];
        return {
          id: device.id,
          driverDeviceId: device.id,
          driverName: `${device.driver.firstName} ${device.driver.lastName}`.trim(),
          driverPhone: device.driver.phone,
          gpsStatus: latest?.gpsStatus ?? 'UNKNOWN',
          permissionStatus: latest?.permissionStatus ?? 'UNKNOWN',
          connectivityStatus: latest?.connectivityStatus ?? 'UNKNOWN',
          trackingStatus: latest?.trackingStatus ?? 'STOPPED',
          batteryLevel: latest?.batteryLevel ?? null,
          batteryState: latest?.batteryState ?? null,
          appVersion: latest?.appVersion ?? null,
          osVersion: latest?.osVersion ?? null,
          deviceModel: latest?.deviceModel ?? null,
          observedAt: latest?.observedAt ?? device.lastHeartbeatAt ?? device.updatedAt,
          lastHeartbeatAt: device.lastHeartbeatAt,
        };
      }),
    };
  }
}
