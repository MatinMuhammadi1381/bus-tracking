import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublicTrackingDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  token: string;
}

export class PublicTrackingQueryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  token: string;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
}

export class VerifyPassengerDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'cm123passenger' })
  @IsString()
  passengerId: string;
}

export class PublicTripResponseDto {
  @ApiProperty()
  tripId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  origin: string;

  @ApiProperty()
  destination: string;

  @ApiProperty({ nullable: true })
  departureDate: string | null;

  @ApiProperty({ nullable: true })
  departureTime: string | null;

  @ApiProperty()
  bus: {
    displayName: string;
    plateNumber: string;
    busCode: string | null;
    seatCount: number;
  };

  @ApiProperty()
  occupiedSeats: {
    seatNumber: number;
    gender: 'UNKNOWN' | 'MALE' | 'FEMALE';
  }[];

  @ApiProperty()
  activeDriver: {
    firstName: string;
    lastName: string;
  } | null;

  @ApiProperty()
  passengerCount: number;

  @ApiProperty()
  currentLocation: {
    latitude: number;
    longitude: number;
    speedKmh: number | null;
    capturedAt: Date;
    status: 'LIVE' | 'PREDICTED' | 'LAST_KNOWN' | 'STALE';
  } | null;

  @ApiProperty()
  etaMinutes: number | null;

  @ApiProperty()
  startedAt: Date | null;

  @ApiProperty()
  completedAt: Date | null;
}

export class PublicLocationHistoryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  token: string;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
}

export class PublicLocationPointDto {
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
  status: 'LIVE' | 'PREDICTED' | 'LAST_KNOWN' | 'STALE';
}
