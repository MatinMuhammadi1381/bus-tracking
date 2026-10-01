import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BusesService } from './buses.service';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { BusStatus } from '@bus-tracking/shared-types';

const BUS_STATUS_VALUES = ['ACTIVE', 'MAINTENANCE', 'RETIRED'] as const;

@ApiTags('Buses')
@Controller('buses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BusesController {
  constructor(private busesService: BusesService) {}

  @Post()
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Create a new bus' })
  async create(@Body() dto: CreateBusDto) {
    return this.busesService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'List all buses with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: BUS_STATUS_VALUES })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: BusStatus
  ) {
    return this.busesService.findAll({ page: page || 1, limit: limit || 20, search, status });
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Get bus by ID' })
  async findById(@Param('id') id: string) {
    return this.busesService.findById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Update bus' })
  async update(@Param('id') id: string, @Body() dto: UpdateBusDto) {
    return this.busesService.update(id, dto);
  }

  @Put(':id/status')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Update bus status' })
  async updateStatus(@Param('id') id: string, @Body('status') status: BusStatus) {
    return this.busesService.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete bus (Admin only)' })
  async delete(@Param('id') id: string) {
    return this.busesService.delete(id);
  }
}
