import { IsString, IsOptional, IsNumber, Min, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRouteDto {
  @ApiProperty({ example: 'تهران' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  origin: string;

  @ApiProperty({ example: 'مشهد' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  destination: string;

  @ApiProperty({
    example: {
      type: 'LineString',
      coordinates: [
        [51.4, 35.7],
        [59.6, 36.3],
      ],
    },
    required: false,
  })
  @IsOptional()
  geometry?: { type: 'LineString'; coordinates: number[][] };

  @ApiProperty({ example: 900.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalDistanceKm?: number;

  @ApiProperty({ example: 720, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDurationMinutes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  routingMetadata?: Record<string, any>;
}
