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
  addCollaboratorSchema,
} from '../orders/order.validator.js';
import { AppError } from '../errors/app-error.js';
import { generateDailyOrdersCsv } from '../orders/order.csv.service.js';

const router = Router();
const orderService = new OrderService();


/**
 * All order routes require valid authentication
 */
router.use(authenticate);

/**
 * GET /api/orders/eligible-waiters
 * List all waiters eligible to be added as collaborators
 */
router.get(
  '/eligible-waiters',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const waiters = await orderService.getEligibleWaiters(req.user);

      res.status(200).json({
        status: 'success',
        data: {
          waiters,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);


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

      const result = await orderService.listOrders(req.user, parseResult.data);

      res.status(200).json({
        status: 'success',
        data: {
          orders: result.orders,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          count: result.total,
        },
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/orders/export/csv
 * Export day's orders as CSV file attachment (Staff accessible)
 */
router.get(
  '/export/csv',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      // Default date to today's date if not specified
      const dateStr =
        typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
          ? req.query.date
          : new Date().toISOString().slice(0, 10);

      // Fetch all orders for the requested date
      const result = await orderService.listOrders(req.user, {
        date: dateStr,
        limit: 1000,
        page: 1,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      const csvContent = generateDailyOrdersCsv(result.orders, dateStr);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="orders-${dateStr}.csv"`);
      res.status(200).send(csvContent);
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

/**
 * GET /api/orders/:id/collaborators
 * List all collaborators assigned to the order
 */
router.get(
  '/:id/collaborators',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const collaborators = await orderService.getCollaborators(req.user, orderId);

      res.status(200).json({
        status: 'success',
        data: {
          collaborators,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/orders/:id/collaborators
 * Assign a waiter as a collaborator on an order
 */
router.post(
  '/:id/collaborators',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const targetUserId = req.body.userId || req.body.waiterId;

      const parseResult = addCollaboratorSchema.safeParse({ userId: targetUserId });
      if (!parseResult.success) {
        throw AppError.badRequest(
          'Validation failed',
          parseResult.error.flatten().fieldErrors
        );
      }

      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      const collaborator = await orderService.addCollaborator(
        req.user,
        orderId,
        parseResult.data.userId
      );

      res.status(201).json({
        status: 'success',
        message: 'Collaborator added to order successfully',
        data: {
          collaborator,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/orders/:id/collaborators/:userId
 * Remove a collaborator from an order
 */
router.delete(
  '/:id/collaborators/:userId',
  requireStaff,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const targetUserId = Array.isArray(req.params.userId)
        ? req.params.userId[0]
        : req.params.userId;

      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }

      await orderService.removeCollaborator(req.user, orderId, targetUserId);

      res.status(200).json({
        status: 'success',
        message: 'Collaborator removed from order successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export const orderRouter = router;


