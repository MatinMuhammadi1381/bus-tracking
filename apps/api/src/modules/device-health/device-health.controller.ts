import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DeviceHealthService } from './device-health.service';
import { DeviceHealthDto, DeviceHealthQueryDto } from './dto/device-health.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Device Health')
@Controller('device-health')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DeviceHealthController {
  constructor(private deviceHealthService: DeviceHealthService) {}

  @Post('ingest')
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Ingest device health data from driver device' })
  async ingestHealth(@CurrentUser() user: any, @Body() dto: DeviceHealthDto) {
    return this.deviceHealthService.ingestHealth({ ...dto, driverId: user.sub });
  }

  @Get('history')
  @Roles('ADMIN', 'SUPPORT', 'DRIVER')
  @ApiOperation({ summary: 'Get device health history' })
  @ApiQuery({ name: 'driverDeviceId', required: true, type: String })
  @ApiQuery({ name: 'tripId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHealthHistory(@Query() query: DeviceHealthQueryDto, @CurrentUser() user: any) {
    if (user.role === 'DRIVER') {
      // Driver can only see their own device health
      if (query.driverDeviceId !== user.deviceId) {
        return [];
      }
    }
    return this.deviceHealthService.getHealthHistory(query);
  }

  @Get('latest')
  @Roles('ADMIN', 'SUPPORT', 'DRIVER')
  @ApiOperation({ summary: 'Get latest device health' })
  @ApiQuery({ name: 'driverDeviceId', required: true, type: String })
  @ApiQuery({ name: 'tripId', required: false, type: String })
  async getLatestHealth(
    @Query('driverDeviceId') driverDeviceId: string,
    @Query('tripId') tripId: string | undefined,
    @CurrentUser() user: any
  ) {
    if (user.role === 'DRIVER') {
      if (driverDeviceId !== user.deviceId) {
        throw new Error('Not authorized to access this device health');
      }
    }
    return this.deviceHealthService.getLatestHealth(driverDeviceId, tripId);
  }

  @Get('latest/all')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Get latest health for all provisioned driver devices' })
  async getLatestHealthForAll() {
    return this.deviceHealthService.getLatestHealthForAll();
  }
}
