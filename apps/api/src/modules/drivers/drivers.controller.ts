import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
  HttpCode,
  HttpStatus,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationInput } from '@bus-tracking/validation';
import type { DriverStatus } from '@bus-tracking/shared-types';

@ApiTags('Drivers')
@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth()
export class DriversController {
  constructor(private driversService: DriversService) {}

  @Get('me')
  @Roles('DRIVER')
  async getMyProfile(@CurrentUser() user: any) {
    return this.toDriverProfile(await this.driversService.findById(user.sub));
  }

  @Put('me/password')
  @Roles('DRIVER')
  async updateMyPassword(
    @CurrentUser() user: any,
    @Body()
    body: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    }
  ) {
    const currentPassword = body.currentPassword?.trim();
    const newPassword = body.newPassword?.trim();
    if (!currentPassword || !newPassword || !body.confirmPassword) {
      throw new BadRequestException('All password fields are required');
    }
    if (newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    if (newPassword !== body.confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }
    return this.toDriverProfile(
      await this.driversService.updatePassword(user.sub, currentPassword, newPassword)
    );
  }

  @Delete('me/profile-photo')
  @Roles('DRIVER')
  async deleteMyProfilePhoto(@CurrentUser() user: any) {
    const previous = await this.driversService.findById(user.sub);
    const updated = await this.driversService.updateProfilePhoto(user.sub, null);
    await this.removeStoredPhoto(previous.profilePhotoUrl);
    return this.toDriverProfile(updated);
  }

  @Post('me/profile-photo')
  @Roles('DRIVER')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 5 * 1024 * 1024 },
      storage: diskStorage({
        destination: './uploads/drivers',
        filename: (_request, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      fileFilter: (_request, file, callback) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
          callback(new BadRequestException('Only JPEG, PNG, and WebP images are allowed'), false);
          return;
        }
        callback(null, true);
      },
    })
  )
  async uploadMyProfilePhoto(
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException('Profile photo is required');
    const previous = await this.driversService.findById(user.sub);
    const updated = await this.driversService.updateProfilePhoto(
      user.sub,
      `/uploads/drivers/${file.filename}`
    );
    await this.removeStoredPhoto(previous.profilePhotoUrl);
    return this.toDriverProfile(updated);
  }

  @Post()
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Create a new driver' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'List all drivers with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string
  ) {
    const pagination = { page: page || 1, limit: limit || 20 };
    return this.driversService.findAll({ ...pagination, search });
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Get driver by ID' })
  async findById(@Param('id') id: string) {
    return this.driversService.findById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Update driver' })
  async update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.update(id, dto);
  }

  @Put(':id/status')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Update driver status' })
  async updateStatus(@Param('id') id: string, @Body('status') status: DriverStatus) {
    return this.driversService.updateStatus(id, status);
  }

  @Put(':id/password')
  @Roles('ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Reset driver password' })
  async updatePassword(@Param('id') id: string, @Body('password') password: string) {
    if (!password || password.trim().length === 0) {
      throw new BadRequestException('Password is required');
    }
    return this.driversService.updatePassword(id, undefined, password);
  }

  @Post(':id/profile-photo')
  @Roles('ADMIN', 'SUPPORT')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 5 * 1024 * 1024 },
      storage: diskStorage({
        destination: './uploads/drivers',
        filename: (_request, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      fileFilter: (_request, file, callback) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
          callback(new BadRequestException('Only JPEG, PNG, and WebP images are allowed'), false);
          return;
        }
        callback(null, true);
      },
    })
  )
  async uploadProfilePhoto(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Profile photo is required');
    const previous = await this.driversService.findById(id);
    const updated = await this.driversService.updateProfilePhoto(
      id,
      `/uploads/drivers/${file.filename}`
    );
    await this.removeStoredPhoto(previous.profilePhotoUrl);
    return updated;
  }

  private async removeStoredPhoto(photoUrl?: string | null) {
    if (!photoUrl?.startsWith('/uploads/drivers/')) return;
    try {
      await unlink(join(process.cwd(), photoUrl.slice(1)));
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        throw error;
      }
    }
  }

  private toDriverProfile(driver: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    status: DriverStatus;
    profilePhotoUrl: string | null;
  }) {
    return {
      id: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      status: driver.status,
      profilePhotoUrl: driver.profilePhotoUrl,
    };
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete driver (Admin only)' })
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    return this.driversService.delete(id);
  }
}
