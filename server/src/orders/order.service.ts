import { OrderRepository } from './order.repository.js';
import { MenuRepository } from '../menu/menu.repository.js';
import { AppError } from '../errors/app-error.js';
import { UserResponse } from '../types/auth.js';
import {
  CreateOrderInput,
  OrderWithLines,
  OrderQueryFilters,
} from '../types/order.js';
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
}

