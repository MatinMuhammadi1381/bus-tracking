import { PartialType } from '@nestjs/swagger';
import { CreatePassengerDto } from './create-passenger.dto';

export class UpdatePassengerDto extends PartialType(CreatePassengerDto) {}
