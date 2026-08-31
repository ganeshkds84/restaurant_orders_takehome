import { OrderStatus } from '../types/order.js';

export const ORDER_STATUS_PROGRESSION: Record<OrderStatus, OrderStatus | null> = {
  placed: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'served',
  served: null,
  cancelled: null,
};

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['served'],
  served: [],
  cancelled: [],
};

export interface TransitionValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validates whether an order can transition from currentStatus to targetStatus
 * according to assignment business rules.
 */
export function validateStatusTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): TransitionValidationResult {
  if (currentStatus === targetStatus) {
    return {
      allowed: false,
      reason: `Order is already in '${currentStatus}' status`,
    };
  }

  if (currentStatus === 'served' || currentStatus === 'cancelled') {
    return {
      allowed: false,
      reason: `Cannot transition order: '${currentStatus}' is a terminal state and cannot be modified`,
    };
  }

  // Handle Cancellation logic
  if (targetStatus === 'cancelled') {
    if (canCancelOrder(currentStatus)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Cannot cancel order: cancellation is only permitted while an order is 'placed' or 'accepted'. Current status is '${currentStatus}'`,
    };
  }

  const allowedNextStates = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (allowedNextStates.includes(targetStatus)) {
    return { allowed: true };
  }

  // Provide informative reasons for illegal attempts
  const progressionOrder: OrderStatus[] = ['placed', 'accepted', 'preparing', 'ready', 'served'];
  const currentIndex = progressionOrder.indexOf(currentStatus);
  const targetIndex = progressionOrder.indexOf(targetStatus);

  if (currentIndex !== -1 && targetIndex !== -1) {
    if (targetIndex < currentIndex) {
      return {
        allowed: false,
        reason: `Illegal backward transition: cannot move order backwards from '${currentStatus}' to '${targetStatus}'`,
      };
    }
    if (targetIndex > currentIndex + 1) {
      const expectedNext = ORDER_STATUS_PROGRESSION[currentStatus];
      return {
        allowed: false,
        reason: `Illegal state skip: cannot transition directly from '${currentStatus}' to '${targetStatus}'. Expected next state: '${expectedNext}'`,
      };
    }
  }

  return {
    allowed: false,
    reason: `Invalid status transition from '${currentStatus}' to '${targetStatus}'`,
  };
}

/**
 * Checks whether an order is in a state that permits full cancellation.
 * Rule: Cancellation is permitted only while still Placed or Accepted.
 */
export function canCancelOrder(status: OrderStatus): boolean {
  return status === 'placed' || status === 'accepted';
}

/**
 * Checks whether an order remains open.
 * Rule: Any state before Served or Cancelled.
 */
export function isOpenOrder(status: OrderStatus): boolean {
  return status !== 'served' && status !== 'cancelled';
}

/**
 * Checks whether line items can be voided on an order.
 * Rule: Any line can be voided for as long as the order remains open (before Served or Cancelled).
 */
export function canVoidOrderLines(status: OrderStatus): boolean {
  return isOpenOrder(status);
}

/**
 * Checks whether additional line items can be added to an order.
 * Rule: Lines can be added to an order at any point before it is served.
 */
export function canAddLinesToOrder(status: OrderStatus): boolean {
  return isOpenOrder(status);
}
