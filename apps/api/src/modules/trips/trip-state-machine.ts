import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TripStatus, PassengerCountStatus } from '@bus-tracking/shared-types';

export type ValidTransition =
  | 'DRAFT'
  | 'ASSIGNED'
  | 'PENDING_DRIVER_CONFIRMATION'
  | 'READY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface TransitionRule {
  from: TripStatus;
  to: TripStatus;
  allowedRoles: string[];
  validator?: (trip: any, user: any, dto?: any) => Promise<void>;
}

export const TRIP_TRANSITIONS: TransitionRule[] = [
  // DRAFT -> ASSIGNED (Support creates trip with drivers)
  {
    from: 'DRAFT',
    to: 'ASSIGNED',
    allowedRoles: ['ADMIN', 'SUPPORT'],
  },
  // ASSIGNED -> PENDING_DRIVER_CONFIRMATION (first driver confirms)
  {
    from: 'ASSIGNED',
    to: 'PENDING_DRIVER_CONFIRMATION',
    allowedRoles: ['DRIVER'],
  },
  // PENDING_DRIVER_CONFIRMATION -> PENDING_DRIVER_CONFIRMATION (second driver confirms, stays same)
  {
    from: 'PENDING_DRIVER_CONFIRMATION',
    to: 'PENDING_DRIVER_CONFIRMATION',
    allowedRoles: ['DRIVER'],
  },
  // PENDING_DRIVER_CONFIRMATION -> READY (both drivers confirmed, auto-transition)
  {
    from: 'PENDING_DRIVER_CONFIRMATION',
    to: 'READY',
    allowedRoles: ['SYSTEM'],
  },
  // READY -> IN_PROGRESS (active driver starts trip)
  {
    from: 'READY',
    to: 'IN_PROGRESS',
    allowedRoles: ['DRIVER'],
    validator: async (trip: any, user: any) => {
      if (trip.activeDriverId !== user.sub) {
        throw new ForbiddenException('Only the active driver can start the trip');
      }
    },
  },
  // IN_PROGRESS -> COMPLETED (active driver ends trip)
  {
    from: 'IN_PROGRESS',
    to: 'COMPLETED',
    allowedRoles: ['DRIVER'],
    validator: async (trip: any, user: any) => {
      if (trip.activeDriverId !== user.sub) {
        throw new ForbiddenException('Only the active driver can end the trip');
      }
    },
  },
  // IN_PROGRESS -> IN_PROGRESS (handover, same status, driver changes)
  {
    from: 'IN_PROGRESS',
    to: 'IN_PROGRESS',
    allowedRoles: ['DRIVER'],
    validator: async (trip: any, user: any) => {
      if (trip.activeDriverId !== user.sub) {
        throw new ForbiddenException('Only the active driver can initiate handover');
      }
    },
  },
  // Any active state -> CANCELLED (Support only)
  {
    from: 'ASSIGNED',
    to: 'CANCELLED',
    allowedRoles: ['ADMIN', 'SUPPORT'],
  },
  {
    from: 'PENDING_DRIVER_CONFIRMATION',
    to: 'CANCELLED',
    allowedRoles: ['ADMIN', 'SUPPORT'],
  },
  {
    from: 'READY',
    to: 'CANCELLED',
    allowedRoles: ['ADMIN', 'SUPPORT'],
  },
  {
    from: 'IN_PROGRESS',
    to: 'CANCELLED',
    allowedRoles: ['ADMIN', 'SUPPORT'],
  },
  // DRAFT -> CANCELLED (Support)
  {
    from: 'DRAFT',
    to: 'CANCELLED',
    allowedRoles: ['ADMIN', 'SUPPORT'],
  },
];

export function validateTransition(
  currentStatus: TripStatus,
  newStatus: TripStatus,
  userRole: string,
  isSystem: boolean = false
): void {
  const effectiveRole = isSystem ? 'SYSTEM' : userRole;

  const rule = TRIP_TRANSITIONS.find(r => r.from === currentStatus && r.to === newStatus);

  if (!rule) {
    throw new BadRequestException(`Invalid state transition from ${currentStatus} to ${newStatus}`);
  }

  if (!rule.allowedRoles.includes(effectiveRole)) {
    throw new ForbiddenException(
      `Role ${effectiveRole} cannot transition from ${currentStatus} to ${newStatus}`
    );
  }
}

export async function runTransitionValidators(
  trip: any,
  user: any,
  newStatus: TripStatus,
  dto?: any
): Promise<void> {
  const rule = TRIP_TRANSITIONS.find(r => r.from === trip.status && r.to === newStatus);

  if (rule?.validator) {
    await rule.validator(trip, user, dto);
  }
}

export function isTerminalStatus(status: TripStatus): boolean {
  return ['COMPLETED', 'CANCELLED'].includes(status);
}

export function isActiveStatus(status: TripStatus): boolean {
  return ['IN_PROGRESS', 'READY', 'PENDING_DRIVER_CONFIRMATION'].includes(status);
}

export function canModifyTripData(status: TripStatus): boolean {
  // Data is locked after first driver confirmation
  return ['DRAFT', 'ASSIGNED'].includes(status);
}

export function getNextStatusAfterConfirmation(
  currentStatus: TripStatus,
  allConfirmed: boolean
): TripStatus {
  if (currentStatus === 'ASSIGNED') {
    return 'PENDING_DRIVER_CONFIRMATION';
  }
  if (currentStatus === 'PENDING_DRIVER_CONFIRMATION' && allConfirmed) {
    return 'READY';
  }
  return currentStatus;
}

export function getAvailableTransitions(status: TripStatus, userRole: string): TripStatus[] {
  return TRIP_TRANSITIONS.filter(
    r =>
      r.from === status && (r.allowedRoles.includes(userRole) || r.allowedRoles.includes('SYSTEM'))
  ).map(r => r.to);
}
