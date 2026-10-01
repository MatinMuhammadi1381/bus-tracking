import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Matches, Min } from 'class-validator';
import { Transform } from 'class-transformer';

const normalizeDigits = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).trim()
    : value;

export class UpdateTripDto {
  @ApiPropertyOptional({ example: 32 })
  @Transform(normalizeDigits)
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedPassengerCount?: number;

  @ApiPropertyOptional({ example: '1405/06/27', nullable: true })
  @Transform(normalizeDigits)
  @IsOptional()
  @Matches(/^\d{4}\/\d{2}\/\d{2}$/, {
    message: 'departureDate must be YYYY/MM/DD',
  })
  departureDate?: string | null;

  @ApiPropertyOptional({ example: '08:30', nullable: true })
  @Transform(normalizeDigits)
  @IsOptional()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, {
    message: 'departureTime must be HH:mm',
  })
  departureTime?: string | null;
}
