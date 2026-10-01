import { BusStatus } from '@bus-tracking/shared-types';

export class BusEntity {
  id: string;
  displayName: string;
  model: string | null;
  manufactureYear: number | null;
  color: string | null;
  plateNumber: string;
  fleetNumber: string | null;
  busCode: string | null;
  seatCount: number;
  status: BusStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<BusEntity>) {
    Object.assign(this, partial);
  }
}
