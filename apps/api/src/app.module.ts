import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { DevicesModule } from './modules/devices/devices.module';
import { BusesModule } from './modules/buses/buses.module';
import { RoutesModule } from './modules/routes/routes.module';
import { PassengersModule } from './modules/passengers/passengers.module';
import { TripsModule } from './modules/trips/trips.module';
import { DriverHandoverModule } from './modules/driver-handover/driver-handover.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { DeviceHealthModule } from './modules/device-health/device-health.module';
import { PublicTrackingModule } from './modules/public-tracking/public-tracking.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), 'apps/api/.env.local'),
        resolve(process.cwd(), 'apps/api/.env'),
        '.env.local',
        '.env',
      ],
    }),
    AuthModule,
    AuthorizationModule,
    DriversModule,
    DevicesModule,
    BusesModule,
    RoutesModule,
    PassengersModule,
    TripsModule,
    DriverHandoverModule,
    TrackingModule,
    DeviceHealthModule,
    PublicTrackingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
