import { IsString, MinLength, MaxLength, Matches, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePassengerDto {
  @ApiProperty({ example: 'PAX-0001', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  passengerCode?: string;
  @ApiProperty({ example: 'علی' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'رضایی' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: '+989123456789' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phone: string;

  @ApiProperty({ enum: ['UNKNOWN', 'MALE', 'FEMALE'], default: 'UNKNOWN' })
  @IsEnum(['UNKNOWN', 'MALE', 'FEMALE'])
  gender: 'UNKNOWN' | 'MALE' | 'FEMALE' = 'UNKNOWN';
}
