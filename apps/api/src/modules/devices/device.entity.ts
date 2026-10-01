import { Exclude } from 'class-transformer';
import { ProvisioningStatus, SessionStatus } from '@bus-tracking/shared-types';

export class DeviceEntity {
  id: string;
  driverId: string;
  deviceIdentifier: string;
  provisioningStatus: ProvisioningStatus;
  sessionStatus: SessionStatus;
  revokedAt: Date | null;
  lastHeartbeatAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<DeviceEntity>) {
    Object.assign(this, partial);
  }
}
