import { dbPool } from '../db/connection.js';
import {
  DbOrder,
  DbOrderLine,
  Order,
  OrderLine,
  OrderWithLines,
  OrderQueryFilters,
  OrderStatus,
} from '../types/order.js';
import { logger } from '../logging/logger.js';
import crypto from 'crypto';

export function mapToOrderLine(dbLine: DbOrderLine): OrderLine {
  const unitPrice =
    typeof dbLine.unit_price === 'number'
      ? dbLine.unit_price
      : parseFloat(String(dbLine.unit_price));
  const lineTotal = Math.round(unitPrice * dbLine.quantity * 100) / 100;

  return {
    id: dbLine.id,
    orderId: dbLine.order_id,
    menuItemId: dbLine.menu_item_id,
    itemName: dbLine.item_name,
    quantity: dbLine.quantity,
    unitPrice,
    lineTotal,
    specialInstructions: dbLine.special_instructions || '',
    isVoided: dbLine.is_voided,
    voidReason: dbLine.void_reason || null,
    createdAt:
      dbLine.created_at instanceof Date
        ? dbLine.created_at.toISOString()
        : String(dbLine.created_at),
    updatedAt:
      dbLine.updated_at instanceof Date
        ? dbLine.updated_at.toISOString()
        : String(dbLine.updated_at),
  };
}

export function mapToOrder(dbOrder: DbOrder, lines: OrderLine[] = []): OrderWithLines {
  const totalPrice =
    typeof dbOrder.total_price === 'number'
      ? dbOrder.total_price
      : parseFloat(String(dbOrder.total_price));

  return {
    id: dbOrder.id,
    tableNumber: dbOrder.table_number,
    primaryWaiterId: dbOrder.primary_waiter_id,
    primaryWaiter: dbOrder.primary_waiter_name
      ? {
          id: dbOrder.primary_waiter_id,
          name: dbOrder.primary_waiter_name,
          email: dbOrder.primary_waiter_email || '',
        }
      : undefined,
    status: dbOrder.status,
    isArchived: dbOrder.is_archived,
    totalPrice: Math.round(totalPrice * 100) / 100,
    createdAt:
      dbOrder.created_at instanceof Date
        ? dbOrder.created_at.toISOString()
        : String(dbOrder.created_at),
    updatedAt:
      dbOrder.updated_at instanceof Date
        ? dbOrder.updated_at.toISOString()
        : String(dbOrder.updated_at),
    lines,
  };
}

// In-memory storage for database-offline / test scenarios
const memoryOrders: Map<string, DbOrder> = new Map();
const memoryOrderLines: Map<string, DbOrderLine> = new Map();

function isConnectionError(err: unknown): boolean {
  if (!err) return false;
  const errorObj = err as {
    code?: string;
    message?: string;
    name?: string;
    errors?: Array<{ code?: string }>;
  };
  if (
    errorObj.code === 'ECONNREFUSED' ||
    errorObj.code === 'ENOTFOUND' ||
    errorObj.code === 'ETIMEDOUT'
  )
    return true;
  if (errorObj.name === 'AggregateError') return true;
  if (Array.isArray(errorObj.errors) && errorObj.errors.some((e) => e.code === 'ECONNREFUSED'))
    return true;
  return false;
}

export class OrderRepository {
  async createOrderWithLines(
    orderData: {
      tableNumber: string;
      primaryWaiterId: string;
      totalPrice: number;
    },
    linesData: Array<{
      menuItemId: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      specialInstructions: string;
    }>
  ): Promise<OrderWithLines> {
    let client;
    try {
      client = await dbPool.connect();
    } catch (connErr) {
      if (isConnectionError(connErr)) {
        logger.debug('PostgreSQL unavailable; creating order in memory');
        return this.createOrderInMemory(orderData, linesData);
      }
      throw connErr;
    }

    try {
      await client.query('BEGIN');

      const insertOrderQuery = `
        INSERT INTO orders (table_number, primary_waiter_id, status, is_archived, total_price)
        VALUES ($1, $2, 'placed', FALSE, $3)
        RETURNING id, table_number, primary_waiter_id, status, is_archived, total_price, created_at, updated_at
      `;
      const orderRes = await client.query(insertOrderQuery, [
        orderData.tableNumber,
        orderData.primaryWaiterId,
        orderData.totalPrice.toFixed(2),
      ]);
      const createdOrder: DbOrder = orderRes.rows[0];

      const createdLines: DbOrderLine[] = [];
      for (const line of linesData) {
        const insertLineQuery = `
          INSERT INTO order_lines (order_id, menu_item_id, item_name, quantity, unit_price, special_instructions, is_voided)
          VALUES ($1, $2, $3, $4, $5, $6, FALSE)
          RETURNING id, order_id, menu_item_id, item_name, quantity, unit_price, special_instructions, is_voided, void_reason, created_at, updated_at
        `;
        const lineRes = await client.query(insertLineQuery, [
          createdOrder.id,
          line.menuItemId,
          line.itemName,
          line.quantity,
          line.unitPrice.toFixed(2),
          line.specialInstructions || '',
        ]);
        createdLines.push(lineRes.rows[0]);
      }

      // Fetch primary waiter information
      const userRes = await client.query('SELECT name, email FROM users WHERE id = $1', [
        createdOrder.primary_waiter_id,
      ]);
      if (userRes.rows.length > 0) {
        createdOrder.primary_waiter_name = userRes.rows[0].name;
        createdOrder.primary_waiter_email = userRes.rows[0].email;
      }

      await client.query('COMMIT');

      const mappedLines = createdLines.map(mapToOrderLine);
      return mapToOrder(createdOrder, mappedLines);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Failed to create order in transaction, rolled back', { error: err });
      throw err;
    } finally {
      client.release();
    }
  }

  private createOrderInMemory(
    orderData: {
      tableNumber: string;
      primaryWaiterId: string;
      totalPrice: number;
    },
    linesData: Array<{
      menuItemId: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      specialInstructions: string;
    }>
  ): OrderWithLines {
    const orderId = crypto.randomUUID();
    const now = new Date();

    const dbOrder: DbOrder = {
      id: orderId,
      table_number: orderData.tableNumber,
      primary_waiter_id: orderData.primaryWaiterId,
      status: 'placed',
      is_archived: false,
      total_price: orderData.totalPrice.toFixed(2),
      created_at: now,
      updated_at: now,
    };

    const createdDbLines: DbOrderLine[] = [];
    for (const line of linesData) {
      const lineId = crypto.randomUUID();
      const dbLine: DbOrderLine = {
        id: lineId,
        order_id: orderId,
        menu_item_id: line.menuItemId,
        item_name: line.itemName,
        quantity: line.quantity,
        unit_price: line.unitPrice.toFixed(2),
        special_instructions: line.specialInstructions || '',
        is_voided: false,
        void_reason: null,
        created_at: now,
        updated_at: now,
      };
      createdDbLines.push(dbLine);
    }

    // Save atomically in memory
    memoryOrders.set(orderId, dbOrder);
    for (const dbLine of createdDbLines) {
      memoryOrderLines.set(dbLine.id, dbLine);
    }

    const mappedLines = createdDbLines.map(mapToOrderLine);
    return mapToOrder(dbOrder, mappedLines);
  }

  async findById(orderId: string): Promise<OrderWithLines | null> {
    try {
      const orderQuery = `
        SELECT o.id, o.table_number, o.primary_waiter_id, o.status, o.is_archived, o.total_price, o.created_at, o.updated_at,
               u.name AS primary_waiter_name, u.email AS primary_waiter_email
        FROM orders o
        LEFT JOIN users u ON o.primary_waiter_id = u.id
        WHERE o.id = $1
        LIMIT 1
      `;
      const { rows: orderRows } = await dbPool.query(orderQuery, [orderId]);
      if (orderRows.length === 0) return null;

      const linesQuery = `
        SELECT id, order_id, menu_item_id, item_name, quantity, unit_price, special_instructions, is_voided, void_reason, created_at, updated_at
        FROM order_lines
        WHERE order_id = $1
        ORDER BY created_at ASC
      `;
      const { rows: lineRows } = await dbPool.query(linesQuery, [orderId]);

      const mappedLines = (lineRows as DbOrderLine[]).map(mapToOrderLine);
      return mapToOrder(orderRows[0] as DbOrder, mappedLines);
    } catch (err) {
      if (isConnectionError(err)) {
        logger.debug('PostgreSQL unavailable; searching order in memory');
        const dbOrder = memoryOrders.get(orderId);
        if (!dbOrder) return null;

        const lines: DbOrderLine[] = [];
        for (const line of memoryOrderLines.values()) {
          if (line.order_id === orderId) {
            lines.push(line);
          }
        }
        lines.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const mappedLines = lines.map(mapToOrderLine);
        return mapToOrder(dbOrder, mappedLines);
      }
      throw err;
    }
  }

  async findAll(filters: OrderQueryFilters = {}): Promise<OrderWithLines[]> {
    try {
      const conditions: string[] = [];
      const values: unknown[] = [];

      if (filters.primaryWaiterId) {
        values.push(filters.primaryWaiterId);
        conditions.push(`o.primary_waiter_id = $${values.length}`);
      }

      if (filters.status) {
        values.push(filters.status);
        conditions.push(`o.status = $${values.length}`);
      }

      if (filters.isArchived !== undefined) {
        values.push(filters.isArchived);
        conditions.push(`o.is_archived = $${values.length}`);
      }

      if (filters.tableNumber) {
        values.push(`%${filters.tableNumber.trim()}%`);
        conditions.push(`o.table_number ILIKE $${values.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const orderQuery = `
        SELECT o.id, o.table_number, o.primary_waiter_id, o.status, o.is_archived, o.total_price, o.created_at, o.updated_at,
               u.name AS primary_waiter_name, u.email AS primary_waiter_email
        FROM orders o
        LEFT JOIN users u ON o.primary_waiter_id = u.id
        ${whereClause}
        ORDER BY o.created_at DESC
      `;

      const { rows: orderRows } = await dbPool.query(orderQuery, values);
      if (orderRows.length === 0) return [];

      const orderIds = orderRows.map((r: { id: string }) => r.id);
      const linesQuery = `
        SELECT id, order_id, menu_item_id, item_name, quantity, unit_price, special_instructions, is_voided, void_reason, created_at, updated_at
        FROM order_lines
        WHERE order_id = ANY($1::uuid[])
        ORDER BY created_at ASC
      `;
      const { rows: lineRows } = await dbPool.query(linesQuery, [orderIds]);

      const linesByOrderId = new Map<string, OrderLine[]>();
      for (const line of lineRows as DbOrderLine[]) {
        const mapped = mapToOrderLine(line);
        const list = linesByOrderId.get(mapped.orderId) || [];
        list.push(mapped);
        linesByOrderId.set(mapped.orderId, list);
      }

      return (orderRows as DbOrder[]).map((order) =>
        mapToOrder(order, linesByOrderId.get(order.id) || [])
      );
    } catch (err) {
      if (isConnectionError(err)) {
        logger.debug('PostgreSQL unavailable; finding orders in memory');
        let orders = Array.from(memoryOrders.values());

        if (filters.primaryWaiterId) {
          orders = orders.filter((o) => o.primary_waiter_id === filters.primaryWaiterId);
        }
        if (filters.status) {
          orders = orders.filter((o) => o.status === filters.status);
        }
        if (filters.isArchived !== undefined) {
          orders = orders.filter((o) => o.is_archived === filters.isArchived);
        }
        if (filters.tableNumber) {
          const search = filters.tableNumber.trim().toLowerCase();
          orders = orders.filter((o) => o.table_number.toLowerCase().includes(search));
        }

        orders.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return orders.map((order) => {
          const lines = Array.from(memoryOrderLines.values())
            .filter((l) => l.order_id === order.id)
            .sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            .map(mapToOrderLine);
          return mapToOrder(order, lines);
        });
      }
      throw err;
    }
  }

  async updateOrderStatus(
    orderId: string,
    expectedStatus: OrderStatus,
    targetStatus: OrderStatus
  ): Promise<OrderWithLines | null> {
    try {
      const updateQuery = `
        UPDATE orders
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND status = $3
        RETURNING id, table_number, primary_waiter_id, status, is_archived, total_price, created_at, updated_at
      `;
      const { rows } = await dbPool.query(updateQuery, [targetStatus, orderId, expectedStatus]);
      if (rows.length === 0) {
        return null;
      }
      return this.findById(orderId);
    } catch (err) {
      if (isConnectionError(err)) {
        logger.debug('PostgreSQL unavailable; updating order status in memory');
        const dbOrder = memoryOrders.get(orderId);
        if (!dbOrder) return null;
        if (dbOrder.status !== expectedStatus) return null;

        dbOrder.status = targetStatus;
        dbOrder.updated_at = new Date();
        memoryOrders.set(orderId, dbOrder);
        return this.findById(orderId);
      }
      throw err;
    }
  }

  async voidOrderLine(
    orderId: string,
    lineId: string,
    voidReason: string,
    newTotalPrice: number
  ): Promise<OrderWithLines | null> {
    let client;
    try {
      client = await dbPool.connect();
    } catch (connErr) {
      if (isConnectionError(connErr)) {
        logger.debug('PostgreSQL unavailable; voiding order line in memory');
        const dbOrder = memoryOrders.get(orderId);
        const dbLine = memoryOrderLines.get(lineId);
        if (!dbOrder || !dbLine || dbLine.order_id !== orderId) return null;

        dbLine.is_voided = true;
        dbLine.void_reason = voidReason;
        dbLine.updated_at = new Date();
        memoryOrderLines.set(lineId, dbLine);

        dbOrder.total_price = newTotalPrice.toFixed(2);
        dbOrder.updated_at = new Date();
        memoryOrders.set(orderId, dbOrder);

        return this.findById(orderId);
      }
      throw connErr;
    }

    try {
      await client.query('BEGIN');

      const voidLineQuery = `
        UPDATE order_lines
        SET is_voided = TRUE, void_reason = $1, updated_at = NOW()
        WHERE id = $2 AND order_id = $3
        RETURNING id
      `;
      const lineRes = await client.query(voidLineQuery, [voidReason, lineId, orderId]);
      if (lineRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const updateOrderQuery = `
        UPDATE orders
        SET total_price = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id
      `;
      await client.query(updateOrderQuery, [newTotalPrice.toFixed(2), orderId]);

      await client.query('COMMIT');
      return this.findById(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Failed to void order line in transaction', { error: err });
      throw err;
    } finally {
      client.release();
    }
  }

  async addOrderLine(
    orderId: string,
    lineData: {
      menuItemId: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      specialInstructions: string;
    },
    newTotalPrice: number
  ): Promise<OrderWithLines | null> {
    let client;
    try {
      client = await dbPool.connect();
    } catch (connErr) {
      if (isConnectionError(connErr)) {
        logger.debug('PostgreSQL unavailable; adding order line in memory');
        const dbOrder = memoryOrders.get(orderId);
        if (!dbOrder) return null;

        const lineId = crypto.randomUUID();
        const now = new Date();
        const dbLine: DbOrderLine = {
          id: lineId,
          order_id: orderId,
          menu_item_id: lineData.menuItemId,
          item_name: lineData.itemName,
          quantity: lineData.quantity,
          unit_price: lineData.unitPrice.toFixed(2),
          special_instructions: lineData.specialInstructions || '',
          is_voided: false,
          void_reason: null,
          created_at: now,
          updated_at: now,
        };
        memoryOrderLines.set(lineId, dbLine);

        dbOrder.total_price = newTotalPrice.toFixed(2);
        dbOrder.updated_at = now;
        memoryOrders.set(orderId, dbOrder);

        return this.findById(orderId);
      }
      throw connErr;
    }

    try {
      await client.query('BEGIN');

      const insertLineQuery = `
        INSERT INTO order_lines (order_id, menu_item_id, item_name, quantity, unit_price, special_instructions, is_voided)
        VALUES ($1, $2, $3, $4, $5, $6, FALSE)
        RETURNING id
      `;
      await client.query(insertLineQuery, [
        orderId,
        lineData.menuItemId,
        lineData.itemName,
        lineData.quantity,
        lineData.unitPrice.toFixed(2),
        lineData.specialInstructions || '',
      ]);

      const updateOrderQuery = `
        UPDATE orders
        SET total_price = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id
      `;
      await client.query(updateOrderQuery, [newTotalPrice.toFixed(2), orderId]);

      await client.query('COMMIT');
      return this.findById(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Failed to add order line in transaction', { error: err });
      throw err;
    } finally {
      client.release();
    }
  }

  resetMemoryStore(): void {
    memoryOrders.clear();
    memoryOrderLines.clear();
  }

  // Testing helper for clean in-memory state
  clearMemory(): void {
    this.resetMemoryStore();
  }
}

export const orderRepository = new OrderRepository();
