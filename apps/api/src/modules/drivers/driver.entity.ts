import { Exclude } from 'class-transformer';
import { DriverStatus } from '@bus-tracking/shared-types';
import { normalizeDriverPhone } from './phone.util';

export class DriverEntity {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  profilePhotoUrl: string | null;
  passwordPreview: string | null;

  @Exclude()
  passwordHash: string;

  @Exclude()
  refreshToken: string | null;

  status: DriverStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<DriverEntity>) {
    Object.assign(this, partial);
    if (this.phone) this.phone = normalizeDriverPhone(this.phone);
  }
}
