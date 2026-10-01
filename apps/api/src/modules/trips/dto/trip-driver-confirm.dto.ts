import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TripDriverConfirmDto {
  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(0)
  confirmedPassengerCount: number;
}
