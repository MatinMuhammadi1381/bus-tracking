import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import {
  LocationIngestDto,
  LocationQueryDto,
  LocationIngestResponseDto,
  LocationPointResponseDto,
} from './dto/location-ingest.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

@ApiTags('Tracking')
@Controller('tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TrackingController {
  constructor(
    private trackingService: TrackingService,
    private prisma: PrismaService
  ) {}

  @Post('ingest')
  @Roles('DRIVER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ingest location points from driver device' })
  async ingestLocations(
    @CurrentUser() user: any,
    @Body() dto: LocationIngestDto
  ): Promise<LocationIngestResponseDto> {
    return this.trackingService.ingestLocations(dto);
  }

  @Get('history')
  @Roles('ADMIN', 'SUPPORT', 'DRIVER')
  @ApiOperation({ summary: 'Get location history for a trip' })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'ISO datetime from' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'ISO datetime to' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max results (default 100)',
  })
  async getLocationHistory(@Query() query: LocationQueryDto, @CurrentUser() user: any) {
    if (user.role === 'DRIVER') {
      const trip = await this.prisma.trip.findUnique({
        where: { id: query.tripId },
        select: {
          driverAssignments: { where: { driverId: user.sub }, select: { driverId: true } },
        },
      });
      if (!trip?.driverAssignments?.length) {
        return { data: [], total: 0 };
      }
    }
    return this.trackingService.getLocationHistory(query);
  }

  @Get('latest/:tripId')
  @Roles('ADMIN', 'SUPPORT', 'DRIVER')
  @ApiOperation({ summary: 'Get latest location for a trip' })
  async getLatestLocation(@Param('tripId') tripId: string, @CurrentUser() user: any) {
    if (user.role === 'DRIVER') {
      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        select: {
          driverAssignments: { where: { driverId: user.sub }, select: { driverId: true } },
        },
      });
      if (!trip?.driverAssignments?.length) {
        throw new ForbiddenException('Not authorized to access this trip');
      }
    }
    return this.trackingService.getLatestLocation(tripId);
  }

  @Get('status/:tripId')
  @Roles('ADMIN', 'SUPPORT', 'DRIVER')
  @ApiOperation({ summary: 'Get tracking status for a trip' })
  async getTrackingStatus(@Param('tripId') tripId: string, @CurrentUser() user: any) {
    if (user.role === 'DRIVER') {
      const trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        select: {
          driverAssignments: { where: { driverId: user.sub }, select: { driverId: true } },
        },
      });
      if (!trip?.driverAssignments?.length) {
        throw new ForbiddenException('Not authorized to access this trip');
      }
    }
    return this.trackingService.getTripTrackingStatus(tripId);
  }
}
