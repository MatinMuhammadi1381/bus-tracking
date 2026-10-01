import { Module } from '@nestjs/common';
import { DeviceHealthController } from './device-health.controller';
import { DeviceHealthService } from './device-health.service';

@Module({
  controllers: [DeviceHealthController],
  providers: [DeviceHealthService],
  exports: [DeviceHealthService],
})
export class DeviceHealthModule {}
