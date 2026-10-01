import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDriverDto } from './create-driver.dto';

export class UpdateDriverDto extends PartialType(
  OmitType(CreateDriverDto, ['password'] as const)
) {}
