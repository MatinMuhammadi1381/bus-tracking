import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LocationPointDto {
  @ApiProperty({ example: 35.6892 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 51.389 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ example: 85.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  speedKmh?: number;

  @ApiProperty({ example: 3.2, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  accuracyMeters?: number;

  @ApiProperty({ example: '2026-09-13T10:30:00.000Z' })
  @IsString()
  capturedAt: string;

  @ApiProperty({ example: 'GPS', enum: ['GPS', 'NETWORK', 'PASSIVE', 'MANUAL'], required: false })
  @IsOptional()
  @IsString()
  source?: 'GPS' | 'NETWORK' | 'PASSIVE' | 'MANUAL';
}

export class LocationIngestDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  tripId: string;

  @ApiProperty({ type: [LocationPointDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationPointDto)
  locations: LocationPointDto[];

  @ApiProperty({ example: 'ingest_1699876543210_abc123' })
  @IsString()
  idempotencyKey: string;
}

export class LocationQueryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  tripId: string;

  @ApiProperty({ example: '2026-09-13T08:00:00.000Z', required: false })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ example: '2026-09-13T12:00:00.000Z', required: false })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
}

export class LocationPointResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tripId: string;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty()
  speedKmh: number | null;

  @ApiProperty()
  accuracyMeters: number | null;

  @ApiProperty()
  capturedAt: Date;

  @ApiProperty()
  receivedAt: Date;

  @ApiProperty()
  source: string;
}

export class LocationIngestResponseDto {
  @ApiProperty()
  accepted: number;

  @ApiProperty()
  rejected: number;

  @ApiProperty()
  errors: Array<{ index: number; reason: string }>;
}
