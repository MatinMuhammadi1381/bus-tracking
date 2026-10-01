import { IsInt, Max, Min } from 'class-validator';

export class AssignSeatDto {
  @IsInt()
  @Min(1)
  @Max(26)
  seatNumber: number;
}
