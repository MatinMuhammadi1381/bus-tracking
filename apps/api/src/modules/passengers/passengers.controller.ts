import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PassengersService } from './passengers.service';
import { CreatePassengerDto } from './dto/create-passenger.dto';
import { UpdatePassengerDto } from './dto/update-passenger.dto';
import { AssignSeatDto } from './dto/assign-seat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Passengers')
@Controller('passengers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PassengersController {
  constructor(private passengersService: PassengersService) {}

  @Post()
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Create a new passenger' })
  async create(@Body() dto: CreatePassengerDto) {
    return this.passengersService.create(dto);
  }

  @Get('trip/:tripId')
  @Roles('ADMIN', 'SUPPORT')
  async findByTrip(@Param('tripId') tripId: string) {
    return this.passengersService.findByTrip(tripId);
  }

  @Post('trip/:tripId')
  @Roles('ADMIN', 'SUPPORT')
  async addToTrip(@Param('tripId') tripId: string, @Body() dto: CreatePassengerDto) {
    return this.passengersService.addToTrip(tripId, dto);
  }

  @Put('trip/:tripId/:passengerId')
  @Roles('ADMIN', 'SUPPORT')
  async updateInTrip(
    @Param('tripId') tripId: string,
    @Param('passengerId') passengerId: string,
    @Body() dto: UpdatePassengerDto
  ) {
    return this.passengersService.updateInTrip(tripId, passengerId, dto);
  }

  @Put('trip/:tripId/:passengerId/seat')
  @Roles('ADMIN', 'SUPPORT')
  async assignSeat(
    @Param('tripId') tripId: string,
    @Param('passengerId') passengerId: string,
    @Body() dto: AssignSeatDto
  ) {
    return this.passengersService.assignSeat(tripId, passengerId, dto.seatNumber);
  }

  @Delete('trip/:tripId/:passengerId/seat')
  @Roles('ADMIN', 'SUPPORT')
  async unassignSeat(@Param('tripId') tripId: string, @Param('passengerId') passengerId: string) {
    return this.passengersService.unassignSeat(tripId, passengerId);
  }

  @Delete('trip/:tripId/:passengerId')
  @Roles('ADMIN')
  async removeFromTrip(@Param('tripId') tripId: string, @Param('passengerId') passengerId: string) {
    return this.passengersService.removeFromTrip(tripId, passengerId);
  }

  @Get()
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'List all passengers with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string
  ) {
    return this.passengersService.findAll({ page: page || 1, limit: limit || 20, search });
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Get passenger by ID' })
  async findById(@Param('id') id: string) {
    return this.passengersService.findById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Update passenger' })
  async update(@Param('id') id: string, @Body() dto: UpdatePassengerDto) {
    return this.passengersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete passenger (Admin only)' })
  async delete(@Param('id') id: string) {
    return this.passengersService.delete(id);
  }
}
