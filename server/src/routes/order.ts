import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireStaff } from '../middleware/require-role.js';
import { OrderService } from '../orders/order.service.js';
import {
  createOrderSchema,
  orderQuerySchema,
} from '../orders/order.validator.js';
import { AppError } from '../errors/app-error.js';

const router = Router();
const orderService = new OrderService();

/**
 * All order routes require valid authentication
 */
router.use(authenticate);

/**
 * POST /api/orders
 * Create a new order with line items
 * Accessible by authenticated waiters and managers
 */
router.post(
  '/',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = createOrderSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest(
          'Validation failed',
          parseResult.error.flatten().fieldErrors
        );
      }

      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const order = await orderService.createOrder(req.user, parseResult.data);

      res.status(201).json({
        status: 'success',
        message: 'Order created successfully',
        data: {
          order,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orders
 * List orders (waiters see their own, managers see all)
 */
router.get(
  '/',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = orderQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        throw AppError.badRequest(
          'Invalid query parameters',
          parseResult.error.flatten().fieldErrors
        );
      }

      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const orders = await orderService.listOrders(req.user, parseResult.data);

      res.status(200).json({
        status: 'success',
        data: {
          orders,
          count: orders.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orders/:id
 * Retrieve single order by ID with line items
 */
router.get(
  '/:id',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const order = await orderService.getOrderById(req.user, id);

      res.status(200).json({
        status: 'success',
        data: {
          order,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const orderRouter = router;
