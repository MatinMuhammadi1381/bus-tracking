import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PublicTrackingService } from './public-tracking.service';
import {
  PublicTrackingDto,
  PublicTrackingQueryDto,
  VerifyPassengerDto,
} from './dto/public-tracking.dto';

@ApiTags('Public Tracking')
@Controller('public-tracking')
export class PublicTrackingController {
  constructor(private publicTrackingService: PublicTrackingService) {}

  @Post('trip')
  @ApiOperation({ summary: 'Get trip info by tracking token' })
  async getTripByToken(@Body() dto: PublicTrackingDto) {
    return this.publicTrackingService.getTripByToken(dto);
  }

  @Post('trip/verify-passenger')
  @ApiOperation({ summary: 'Verify a passenger ID for a specific tracking link' })
  async verifyPassenger(@Body() verification: VerifyPassengerDto) {
    return this.publicTrackingService.verifyPassengerForTrip(
      verification.token,
      verification.passengerId
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get location history by tracking token' })
  @ApiQuery({ name: 'token', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLocationHistory(@Query() query: PublicTrackingQueryDto) {
    return this.publicTrackingService.getLocationHistory(query);
  }
}
