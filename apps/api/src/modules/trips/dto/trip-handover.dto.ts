import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TripHandoverDto {
  @ApiProperty({ example: 'uuid-of-next-driver' })
  @IsUUID()
  nextDriverId: string;
}
