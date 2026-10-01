import { Module } from '@nestjs/common';
import { PublicTrackingController } from './public-tracking.controller';
import { PublicTrackingService } from './public-tracking.service';

@Module({
  controllers: [PublicTrackingController],
  providers: [PublicTrackingService],
  exports: [PublicTrackingService],
})
export class PublicTrackingModule {}
