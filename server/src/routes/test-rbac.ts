import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireManager, requireWaiter, requireStaff } from '../middleware/require-role.js';

const router = Router();

/**
 * Test Infrastructure Routes for Server-Side RBAC Verification
 * Clearly marked as test infrastructure endpoints.
 */

// Manager-only route
router.get(
  '/manager-only',
  authenticate,
  requireManager,
  (req: Request, res: Response): void => {
    res.status(200).json({
      status: 'success',
      message: 'Access granted to manager-only resource',
      user: req.user,
    });
  }
);

// Waiter-only route
router.get(
  '/waiter-only',
  authenticate,
  requireWaiter,
  (req: Request, res: Response): void => {
    res.status(200).json({
      status: 'success',
      message: 'Access granted to waiter-only resource',
      user: req.user,
    });
  }
);

// Staff-only (Manager OR Waiter) route
router.get(
  '/staff-only',
  authenticate,
  requireStaff,
  (req: Request, res: Response): void => {
    res.status(200).json({
      status: 'success',
      message: 'Access granted to staff resource (manager or waiter)',
      user: req.user,
    });
  }
);

export const testRbacRouter = router;
