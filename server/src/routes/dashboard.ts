import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireStaff } from '../middleware/require-role.js';
import { dashboardService } from '../dashboard/dashboard.service.js';

const router = Router();

router.use(authenticate);

/**
 * GET /api/dashboard/stats
 * Retrieve landing dashboard numbers, status breakdown, waiter breakdown, and 14-day history
 */
router.get(
  '/stats',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dateStr = typeof req.query.date === 'string' ? req.query.date : undefined;
      const stats = await dashboardService.getDashboardStats(dateStr);

      res.status(200).json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/dashboard
 * Alias for /api/dashboard/stats
 */
router.get(
  '/',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dateStr = typeof req.query.date === 'string' ? req.query.date : undefined;
      const stats = await dashboardService.getDashboardStats(dateStr);

      res.status(200).json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

export const dashboardRouter = router;
