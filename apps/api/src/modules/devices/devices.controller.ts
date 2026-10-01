import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { ProvisionDeviceDto } from './dto/provision-device.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@bus-tracking/shared-types';

@ApiTags('Devices')
@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Post('provision')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Provision a device for a driver (Support only)' })
  async provision(@Body() dto: ProvisionDeviceDto) {
    return this.devicesService.provision(dto);
  }

  @Get('driver/:driverId')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Get all devices for a driver' })
  async getByDriver(@Param('driverId') driverId: string) {
    return this.devicesService.getByDriver(driverId);
  }

  @Get('driver/:driverId/active')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Get active device for a driver' })
  async getActive(@Param('driverId') driverId: string) {
    return this.devicesService.getActiveDevice(driverId);
  }

  @Put(':deviceIdentifier/heartbeat')
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Update device heartbeat (Driver)' })
  async heartbeat(@Param('deviceIdentifier') deviceIdentifier: string) {
    await this.devicesService.updateHeartbeat(deviceIdentifier);
    return { success: true };
  }

  @Put(':deviceIdentifier/session')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Update device session status' })
  async updateSession(
    @Param('deviceIdentifier') deviceIdentifier: string,
    @Query('driverId') driverId: string,
    @Body('sessionStatus') sessionStatus: string
  ) {
    return this.devicesService.updateSessionStatus(
      driverId,
      deviceIdentifier,
      sessionStatus as any
    );
  }

  @Put(':deviceIdentifier/revoke')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Revoke device provisioning' })
  async revoke(
    @Param('deviceIdentifier') deviceIdentifier: string,
    @Query('driverId') driverId: string
  ) {
    return this.devicesService.revoke(driverId, deviceIdentifier);
  }

  @Get('verify')
  @Roles('DRIVER')
  @ApiOperation({ summary: 'Verify current driver device (Driver)' })
  async verify(@CurrentUser() user: any, @Query('deviceIdentifier') deviceIdentifier: string) {
    return this.devicesService.verifyDevice(user.sub, deviceIdentifier);
  }
}
