import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripDriverConfirmDto } from './dto/trip-driver-confirm.dto';
import { TripHandoverDto } from './dto/trip-handover.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { TripStatus } from '@bus-tracking/shared-types';

const TRIP_STATUS_VALUES = [
  'DRAFT',
  'ASSIGNED',
  'PENDING_DRIVER_CONFIRMATION',
  'READY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

@ApiTags('Trips')
@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TripsController {
  constructor(private tripsService: TripsService) {}

  @Post()
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Create a new trip with two driver assignments' })
  async create(@Body() dto: CreateTripDto) {
    return this.tripsService.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Update trip passenger count and departure schedule' })
  async update(@Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.tripsService.update(id, dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'List all trips with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: TRIP_STATUS_VALUES })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: TripStatus
  ) {
    return this.tripsService.findAll({ page: page || 1, limit: limit || 20, search, status });
  }

  @Get('my-active')
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Get active trip for current driver' })
  async getMyActiveTrip(@CurrentUser() user: any) {
    return this.tripsService.findActiveTripByDriver(user.sub);
  }

  @Get('my-assigned')
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Get all assigned trips for current driver' })
  async getMyAssignedTrips(@CurrentUser() user: any) {
    return this.tripsService.findAssignedTripsByDriver(user.sub);
  }

  @Get('my-history')
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Get completed trips for current driver' })
  async getMyTripHistory(@CurrentUser() user: any) {
    return this.tripsService.findTripHistoryByDriver(user.sub);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPPORT', 'DRIVER')
  @ApiOperation({ summary: 'Get trip by ID' })
  async findById(@Param('id') id: string, @CurrentUser() user: any) {
    const trip = await this.tripsService.findById(id);

    // Drivers can only access their own trips
    if (user.role === 'DRIVER') {
      const isAssigned = trip.driverAssignments?.some(a => a.driverId === user.sub);
      const isActive = trip.activeDriverId === user.sub;
      if (!isAssigned && !isActive) {
        throw new Error('Not authorized to access this trip');
      }
    }

    return trip;
  }

  @Post(':id/tracking-link')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Create or return the public tracking link for a trip' })
  async ensureTrackingLink(@Param('id') id: string) {
    return this.tripsService.ensureTrackingLink(id);
  }

  @Put(':id/confirm')
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Driver confirms passenger count' })
  async driverConfirm(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: TripDriverConfirmDto
  ) {
    return this.tripsService.driverConfirm(id, user.sub, dto);
  }

  @Put(':id/start')
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Start trip (Driver only)' })
  async startTrip(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tripsService.startTrip(id, user.sub);
  }

  @Put(':id/end')
  @Roles('DRIVER')
  @ApiOperation({ summary: 'End trip (Driver only)' })
  async endTrip(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tripsService.endTrip(id, user.sub);
  }

  @Put(':id/handover')
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Handover to next driver (Driver only)' })
  async handover(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: TripHandoverDto) {
    return this.tripsService.handover(id, user.sub, dto);
  }

  @Put(':id/cancel')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Cancel trip (Support only)' })
  async cancel(@Param('id') id: string) {
    return this.tripsService.supportCancel(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete trip (Admin only)' })
  async delete(@Param('id') id: string) {
    return this.tripsService.delete(id);
  }
}
