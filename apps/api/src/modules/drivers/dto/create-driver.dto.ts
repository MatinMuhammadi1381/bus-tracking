import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDriverDto {
  @ApiProperty({ example: 'احمد' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'محمدی' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: '09123456789 or 9123456789' })
  @IsString()
  @Matches(/^(?:\+98\d{10}|98\d{10}|0?9\d{9})$/)
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  password: string;
}
