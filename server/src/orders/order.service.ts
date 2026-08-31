import { OrderRepository } from './order.repository.js';
import { MenuRepository } from '../menu/menu.repository.js';
import { AppError } from '../errors/app-error.js';
import { UserResponse } from '../types/auth.js';
import {
  OrderStatus,
  CreateOrderInput,
  OrderWithLines,
  OrderQueryFilters,
  AddOrderLineInput,
} from '../types/order.js';
import {
  validateStatusTransition,
  canVoidOrderLines,
  canAddLinesToOrder,
} from './order.state-machine.js';
import { logger } from '../logging/logger.js';

export class OrderService {
  constructor(
    private orderRepo: OrderRepository = new OrderRepository(),
    private menuRepo: MenuRepository = new MenuRepository()
  ) {}

  async createOrder(
    user: UserResponse,
    input: CreateOrderInput
  ): Promise<OrderWithLines> {
    if (!input.items || input.items.length === 0) {
      throw AppError.badRequest('Order must contain at least one item');
    }

    const linesToCreate: Array<{
      menuItemId: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      specialInstructions: string;
    }> = [];

    // Validate each menu item, ensure availability, snapshot historical price and item name
    for (const item of input.items) {
      const menuItem = await this.menuRepo.findById(item.menuItemId);
      if (!menuItem) {
        throw AppError.badRequest(
          `Menu item not found: ${item.menuItemId}`
        );
      }

      if (menuItem.is_archived) {
        throw AppError.badRequest(
          `Menu item '${menuItem.name}' is archived and cannot be ordered`
        );
      }

      if (!menuItem.is_available) {
        throw AppError.badRequest(
          `Menu item '${menuItem.name}' is currently unavailable (86ed) and cannot be ordered`
        );
      }

      const unitPrice =
        typeof menuItem.price === 'number'
          ? menuItem.price
          : parseFloat(String(menuItem.price));

      linesToCreate.push({
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        quantity: item.quantity,
        unitPrice,
        specialInstructions: (item.specialInstructions || '').trim(),
      });
    }

    // Authoritative total calculated strictly from historical unit prices and quantities
    const totalAmount = linesToCreate.reduce(
      (sum, line) => sum + line.unitPrice * line.quantity,
      0
    );
    const totalPrice = Math.round(totalAmount * 100) / 100;

    logger.info('Creating order', {
      tableNumber: input.tableNumber,
      primaryWaiterId: user.id,
      role: user.role,
      itemCount: linesToCreate.length,
      totalPrice,
    });

    const createdOrder = await this.orderRepo.createOrderWithLines(
      {
        tableNumber: input.tableNumber.trim(),
        primaryWaiterId: user.id,
        totalPrice,
      },
      linesToCreate
    );

    return createdOrder;
  }

  async getOrderById(
    user: UserResponse,
    orderId: string
  ): Promise<OrderWithLines> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw AppError.notFound(`Order not found: ${orderId}`);
    }

    // Role-based authorization: Waiters can only view their own orders; Managers can view all
    if (user.role === 'waiter' && order.primaryWaiterId !== user.id) {
      throw AppError.forbidden('Forbidden: you can only view orders you created');
    }

    return order;
  }

  async listOrders(
    user: UserResponse,
    filters: OrderQueryFilters = {}
  ): Promise<OrderWithLines[]> {
    const scopedFilters: OrderQueryFilters = { ...filters };

    // Waiters can only query orders where they are the primary waiter
    if (user.role === 'waiter') {
      scopedFilters.primaryWaiterId = user.id;
    }

    return this.orderRepo.findAll(scopedFilters);
  }

  /**
   * Transition order lifecycle status using the authoritative state machine.
   */
  async transitionOrderStatus(
    user: UserResponse,
    orderId: string,
    targetStatus: OrderStatus,
    reason?: string
  ): Promise<OrderWithLines> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw AppError.notFound(`Order not found: ${orderId}`);
    }

    // Authorization: Waiters can only modify their own orders; Managers have restaurant-wide permissions
    if (user.role === 'waiter' && order.primaryWaiterId !== user.id) {
      throw AppError.forbidden('Forbidden: you can only update orders you created');
    }

    // Validate state transition against business rules
    const transitionCheck = validateStatusTransition(order.status, targetStatus);
    if (!transitionCheck.allowed) {
      throw AppError.badRequest(transitionCheck.reason || 'Invalid order status transition');
    }

    logger.info('Transitioning order status', {
      orderId,
      fromStatus: order.status,
      toStatus: targetStatus,
      userId: user.id,
      reason,
    });

    const updatedOrder = await this.orderRepo.updateOrderStatus(
      orderId,
      order.status,
      targetStatus
    );

    if (!updatedOrder) {
      // Check for concurrent modification race condition
      const current = await this.orderRepo.findById(orderId);
      if (current && current.status !== order.status) {
        throw new AppError(
          `Conflict: Order status was concurrently changed to '${current.status}'`,
          409
        );
      }
      throw AppError.notFound(`Order not found: ${orderId}`);
    }

    return updatedOrder;
  }

  /**
   * Cancel an order. Allowed only while still 'placed' or 'accepted'.
   */
  async cancelOrder(
    user: UserResponse,
    orderId: string,
    reason?: string
  ): Promise<OrderWithLines> {
    return this.transitionOrderStatus(user, orderId, 'cancelled', reason);
  }

  /**
   * Void an order line on an open order.
   * Preserves historical record, records reason, and recalculates authoritative total.
   */
  async voidOrderLine(
    user: UserResponse,
    orderId: string,
    lineId: string,
    voidReason: string
  ): Promise<OrderWithLines> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw AppError.notFound(`Order not found: ${orderId}`);
    }

    // Authorization check
    if (user.role === 'waiter' && order.primaryWaiterId !== user.id) {
      throw AppError.forbidden('Forbidden: you can only void lines on orders you created');
    }

    // State machine check: Order must remain open (before Served or Cancelled)
    if (!canVoidOrderLines(order.status)) {
      throw AppError.badRequest(
        `Cannot void order line: order is already '${order.status}' (lines can only be voided while order remains open)`
      );
    }

    const targetLine = order.lines.find((l) => l.id === lineId);
    if (!targetLine) {
      throw AppError.notFound(`Order line not found on order: ${lineId}`);
    }

    if (targetLine.isVoided) {
      throw AppError.badRequest('Order line is already voided');
    }

    // Recalculate authoritative total excluding voided lines
    const remainingActiveLines = order.lines.filter(
      (l) => l.id !== lineId && !l.isVoided
    );
    const newTotalAmount = remainingActiveLines.reduce(
      (sum, l) => sum + l.unitPrice * l.quantity,
      0
    );
    const newTotalPrice = Math.round(newTotalAmount * 100) / 100;

    logger.info('Voiding order line', {
      orderId,
      lineId,
      voidReason,
      previousTotal: order.totalPrice,
      newTotalPrice,
    });

    const updatedOrder = await this.orderRepo.voidOrderLine(
      orderId,
      lineId,
      voidReason.trim(),
      newTotalPrice
    );

    if (!updatedOrder) {
      throw AppError.notFound(`Failed to void line on order: ${orderId}`);
    }

    return updatedOrder;
  }

  /**
   * Add a line item to an open order before it is served.
   */
  async addLineToOrder(
    user: UserResponse,
    orderId: string,
    input: AddOrderLineInput
  ): Promise<OrderWithLines> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw AppError.notFound(`Order not found: ${orderId}`);
    }

    // Authorization check
    if (user.role === 'waiter' && order.primaryWaiterId !== user.id) {
      throw AppError.forbidden('Forbidden: you can only add lines to orders you created');
    }

    // State machine check: Lines can be added before served
    if (!canAddLinesToOrder(order.status)) {
      throw AppError.badRequest(
        `Cannot add lines: order has already been '${order.status}'`
      );
    }

    const menuItem = await this.menuRepo.findById(input.menuItemId);
    if (!menuItem) {
      throw AppError.badRequest(`Menu item not found: ${input.menuItemId}`);
    }

    if (menuItem.is_archived) {
      throw AppError.badRequest(
        `Menu item '${menuItem.name}' is archived and cannot be ordered`
      );
    }

    if (!menuItem.is_available) {
      throw AppError.badRequest(
        `Menu item '${menuItem.name}' is currently unavailable (86ed) and cannot be ordered`
      );
    }

    const unitPrice =
      typeof menuItem.price === 'number'
        ? menuItem.price
        : parseFloat(String(menuItem.price));

    const activeLines = order.lines.filter((l) => !l.isVoided);
    const currentActiveTotal = activeLines.reduce(
      (sum, l) => sum + l.unitPrice * l.quantity,
      0
    );
    const newTotalAmount = currentActiveTotal + unitPrice * input.quantity;
    const newTotalPrice = Math.round(newTotalAmount * 100) / 100;

    const updatedOrder = await this.orderRepo.addOrderLine(
      orderId,
      {
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        quantity: input.quantity,
        unitPrice,
        specialInstructions: (input.specialInstructions || '').trim(),
      },
      newTotalPrice
    );

    if (!updatedOrder) {
      throw AppError.notFound(`Failed to add line to order: ${orderId}`);
    }

    return updatedOrder;
  }
}


