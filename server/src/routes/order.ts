import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireStaff } from '../middleware/require-role.js';
import { OrderService } from '../orders/order.service.js';
import {
  createOrderSchema,
  orderQuerySchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  addOrderLineSchema,
  voidOrderLineSchema,
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

/**
 * PATCH /api/orders/:id/status
 * Transition order lifecycle status
 */
router.patch(
  '/:id/status',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const parseResult = updateOrderStatusSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest(
          'Validation failed',
          parseResult.error.flatten().fieldErrors
        );
      }

      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const updatedOrder = await orderService.transitionOrderStatus(
        req.user,
        id,
        parseResult.data.status,
        parseResult.data.reason
      );

      res.status(200).json({
        status: 'success',
        message: `Order status updated to '${parseResult.data.status}'`,
        data: {
          order: updatedOrder,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/orders/:id/cancel
 * Cancel order (allowed only while Placed or Accepted)
 */
router.post(
  '/:id/cancel',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const parseResult = cancelOrderSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest(
          'Validation failed',
          parseResult.error.flatten().fieldErrors
        );
      }

      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const cancelledOrder = await orderService.cancelOrder(
        req.user,
        id,
        parseResult.data.reason
      );

      res.status(200).json({
        status: 'success',
        message: 'Order cancelled successfully',
        data: {
          order: cancelledOrder,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/orders/:id/lines
 * Add a new line item to an open order before it is served
 */
router.post(
  '/:id/lines',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const parseResult = addOrderLineSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest(
          'Validation failed',
          parseResult.error.flatten().fieldErrors
        );
      }

      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const updatedOrder = await orderService.addLineToOrder(
        req.user,
        id,
        parseResult.data
      );

      res.status(201).json({
        status: 'success',
        message: 'Order line added successfully',
        data: {
          order: updatedOrder,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/orders/:id/lines/:lineId/void
 * Void a line item with a required reason
 */
router.patch(
  '/:id/lines/:lineId/void',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const lineId = Array.isArray(req.params.lineId)
        ? req.params.lineId[0]
        : req.params.lineId;

      const parseResult = voidOrderLineSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest(
          'Validation failed',
          parseResult.error.flatten().fieldErrors
        );
      }

      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const updatedOrder = await orderService.voidOrderLine(
        req.user,
        orderId,
        lineId,
        parseResult.data.reason
      );

      res.status(200).json({
        status: 'success',
        message: 'Order line voided successfully',
        data: {
          order: updatedOrder,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export const orderRouter = router;

