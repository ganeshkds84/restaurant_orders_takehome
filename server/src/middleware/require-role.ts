import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/auth.js';
import { AppError } from '../errors/app-error.js';

/**
 * Server-side RBAC middleware.
 * Verifies that the authenticated user possesses one of the allowed roles.
 * Never trusts any role from client body, headers, or query parameters.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Forbidden: role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
}

/**
 * Pre-configured role middleware shortcuts
 */
export const requireManager = requireRole('manager');
export const requireWaiter = requireRole('waiter');
export const requireStaff = requireRole('manager', 'waiter');
