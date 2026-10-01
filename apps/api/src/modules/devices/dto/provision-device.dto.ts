import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProvisionDeviceDto {
  @ApiProperty({ example: 'uuid-of-driver' })
  @IsUUID()
  driverId: string;

  @ApiProperty({ example: 'device-installation-id-or-fcm-token' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  deviceIdentifier: string;
}

export class DeviceStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsString()
  sessionStatus: 'ACTIVE' | 'INACTIVE';
}
