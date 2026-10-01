import { IsString, IsOptional, IsInt, Min, Max, MaxLength, MinLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBusDto {
  @ApiProperty({ example: 'اتوبوس اسکانیا' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;

  @ApiProperty({ example: 'اسکانیا K380', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiProperty({ example: 2022, required: false })
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  manufactureYear?: number;

  @ApiProperty({ example: 'سفید', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiProperty({ example: '۱۲۳۴۵۶۷۸' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  plateNumber: string;

  @ApiProperty({ example: 'FLT-001', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fleetNumber?: string;

  @ApiProperty({ example: 'BUS-001', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  busCode?: string;

  @ApiProperty({ example: 25, enum: [25, 26], default: 25 })
  @IsInt()
  @IsIn([25, 26])
  seatCount: number = 25;
}
