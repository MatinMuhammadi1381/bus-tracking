import {
  IsUUID,
  IsNumber,
  Min,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

const normalizeDigits = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).trim()
    : value;

export class CreateTripDto {
  @ApiProperty({ example: 'uuid-of-bus' })
  @IsUUID()
  busId: string;

  @ApiProperty({ example: 'uuid-of-route' })
  @IsUUID()
  routeId: string;

  @ApiProperty({ example: 32, required: false })
  @IsNumber()
  @Min(0)
  expectedPassengerCount?: number = 0;

  @ApiProperty({ example: '1405/06/27', required: false })
  @Transform(normalizeDigits)
  @IsOptional()
  @Matches(/^\d{4}\/\d{2}\/\d{2}$/, { message: 'departureDate must be YYYY/MM/DD' })
  departureDate?: string;

  @ApiProperty({ example: '08:30', required: false })
  @Transform(normalizeDigits)
  @IsOptional()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, { message: 'departureTime must be HH:mm' })
  departureTime?: string;

  @ApiProperty({ example: ['uuid-driver-1', 'uuid-driver-2'] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsUUID('4', { each: true })
  driverIds: string[];
}
