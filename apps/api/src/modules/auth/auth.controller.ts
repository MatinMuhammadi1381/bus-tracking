import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Put,
  Delete,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Driver login' })
  async login(@Body() body: { phone?: string; username?: string; password: string }) {
    return this.authService.login(body.phone || body.username || '', body.password);
  }

  @Post('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  async createAdmin(
    @Body()
    body: {
      username: string;
      password: string;
      firstName: string;
      lastName: string;
      role?: 'ADMIN' | 'SUPPORT';
    }
  ) {
    return this.authService.createAdmin(body);
  }

  @Get('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List admin users for super admin support' })
  async listAdmins() {
    return this.authService.listAdmins();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List admin users (legacy singular path)' })
  async listAdminsLegacy() {
    return this.authService.listAdmins();
  }

  @Put('admins/:id/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  async resetAdminPassword(@Param('id') id: string, @Body() body: { password: string }) {
    return this.authService.resetAdminPassword(id, body.password);
  }

  @Delete('admins/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAdmin(@Param('id') id: string) {
    await this.authService.deleteAdmin(id);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub);
  }

  @Post('provision/device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Provision driver device (Support only)' })
  async provisionDevice(@Body() body: { driverId: string; deviceIdentifier: string }) {
    return this.authService.provisionDevice(body.driverId, body.deviceIdentifier);
  }
}
