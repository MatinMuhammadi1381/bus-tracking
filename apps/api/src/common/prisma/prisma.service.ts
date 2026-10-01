import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase is not allowed in production');
    }
    const modelNames = [
      'driver',
      'driverDevice',
      'bus',
      'route',
      'passenger',
      'trip',
      'tripDriverAssignment',
      'tripDriverHandover',
      'trackingLink',
      'locationPoint',
      'deviceHealth',
      'tripPassenger',
    ];
    for (const model of modelNames) {
      const client = (this as any)[model];
      if (client?.deleteMany) {
        await client.deleteMany();
      }
    }
  }
}
