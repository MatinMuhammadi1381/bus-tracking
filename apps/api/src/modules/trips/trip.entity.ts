import { TripStatus, PassengerCountStatus } from '@bus-tracking/shared-types';

export class TripEntity {
  id: string;
  activeDriverId: string | null;
  busId: string;
  routeId: string;
  expectedPassengerCount: number;
  departureDate: string | null;
  departureTime: string | null;
  confirmedPassengerCount: number;
  passengerCountStatus: PassengerCountStatus;
  status: TripStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations (populated when needed)
  bus?: any;
  route?: any;
  activeDriver?: any;
  driverAssignments?: any[];
  trackingLink?: any;
  confirmations?: any[];
  driverConfirmationCount?: number;
  assignedDriverCount?: number;
  driverConfirmationStatus?: string;

  constructor(partial: Partial<TripEntity>) {
    Object.assign(this, partial);
  }
}
