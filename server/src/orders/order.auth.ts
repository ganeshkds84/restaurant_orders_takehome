import { UserResponse } from '../types/auth.js';
import { OrderWithLines, Order } from '../types/order.js';

export interface OrderAuthContext {
  primaryWaiterId: string;
  collaborators?: Array<{ userId: string }>;
}

/**
 * Determines whether an authenticated user is permitted to view an order.
 * - Managers have restaurant-wide access to all orders.
 * - Primary waiter who created the order has full access.
 * - Assigned collaborators have access to view the order.
 * - Other unassigned waiters are forbidden.
 */
export function canAccessOrder(
  user: UserResponse,
  order: OrderAuthContext | Order | OrderWithLines
): boolean {
  if (user.role === 'manager') {
    return true;
  }

  if (order.primaryWaiterId === user.id) {
    return true;
  }

  if (order.collaborators && order.collaborators.some((c) => c.userId === user.id)) {
    return true;
  }

  return false;
}

/**
 * Determines whether an authenticated user is permitted to modify an order's lifecycle,
 * void lines, or add lines.
 * - Managers can modify any order.
 * - Primary waiters can modify their orders.
 * - Collaborators can modify orders they are assigned to.
 * - Other unassigned waiters are forbidden.
 */
export function canModifyOrder(
  user: UserResponse,
  order: OrderAuthContext | Order | OrderWithLines
): boolean {
  return canAccessOrder(user, order);
}

/**
 * Determines whether an authenticated user is permitted to manage (add or remove) collaborators.
 * - Managers can manage collaborators on any order.
 * - Primary waiters can manage collaborators on orders they own.
 * - Collaborators themselves cannot manage other collaborators.
 */
export function canManageCollaborators(
  user: UserResponse,
  order: OrderAuthContext | Order | OrderWithLines
): boolean {
  if (user.role === 'manager') {
    return true;
  }

  return order.primaryWaiterId === user.id;
}
