import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Routes')
@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RoutesController {
  constructor(private routesService: RoutesService) {}

  @Post()
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Create a new route' })
  async create(@Body() dto: CreateRouteDto) {
    return this.routesService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'List all routes with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string
  ) {
    return this.routesService.findAll({ page: page || 1, limit: limit || 20, search });
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Get route by ID' })
  async findById(@Param('id') id: string) {
    return this.routesService.findById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Update route' })
  async update(@Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.routesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete route (Admin only)' })
  async delete(@Param('id') id: string) {
    return this.routesService.delete(id);
  }
}
