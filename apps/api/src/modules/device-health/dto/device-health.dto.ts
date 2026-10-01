import { IsUUID, IsNumber, Min, Max, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum GPSStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  UNKNOWN = 'UNKNOWN',
}

export enum PermissionStatus {
  GRANTED = 'GRANTED',
  DENIED = 'DENIED',
  UNKNOWN = 'UNKNOWN',
}

export enum ConnectivityStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  UNKNOWN = 'UNKNOWN',
}

export enum TrackingStatus {
  TRACKING = 'TRACKING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR',
}

export class DeviceHealthDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsUUID()
  driverDeviceId?: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', required: false })
  @IsOptional()
  @IsUUID()
  tripId?: string;

  @ApiProperty({ enum: GPSStatus, example: 'ENABLED' })
  @IsEnum(GPSStatus)
  gpsStatus: GPSStatus;

  @ApiProperty({ enum: PermissionStatus, example: 'GRANTED' })
  @IsEnum(PermissionStatus)
  permissionStatus: PermissionStatus;

  @ApiProperty({ enum: ConnectivityStatus, example: 'ONLINE' })
  @IsEnum(ConnectivityStatus)
  connectivityStatus: ConnectivityStatus;

  @ApiProperty({ enum: TrackingStatus, example: 'TRACKING' })
  @IsEnum(TrackingStatus)
  trackingStatus: TrackingStatus;

  @ApiProperty({ example: 85, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  batteryLevel?: number;

  @ApiProperty({ example: 'charging', required: false })
  @IsOptional()
  @IsString()
  batteryState?: string;

  @ApiProperty({ example: '1.0.0', required: false })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiProperty({ example: 'Android 14', required: false })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiProperty({ example: 'Samsung Galaxy S23', required: false })
  @IsOptional()
  @IsString()
  deviceModel?: string;
}

export class DeviceHealthQueryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  driverDeviceId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', required: false })
  @IsOptional()
  @IsUUID()
  tripId?: string;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
}
