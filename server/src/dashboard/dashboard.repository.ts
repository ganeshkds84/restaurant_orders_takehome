import { dbPool } from '../db/connection.js';
import {
  DashboardStatsResponse,
  HeadlineMetrics,
  StatusBreakdownItem,
  WaiterBreakdownItem,
  DailyServedPoint,
} from '../types/dashboard.js';
import { OrderStatus, DbOrder } from '../types/order.js';
import { orderRepository } from '../orders/order.repository.js';
import { userRepository } from '../users/user.repository.js';
import { logger } from '../logging/logger.js';

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

const ALL_ORDER_STATUSES: OrderStatus[] = [
  'placed',
  'accepted',
  'preparing',
  'ready',
  'served',
  'cancelled',
];

function formatDateYMD(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class DashboardRepository {
  async getDashboardStats(referenceDateStr?: string): Promise<DashboardStatsResponse> {
    try {
      return await this.getStatsFromDatabase(referenceDateStr);
    } catch (err) {
      if (isConnectionError(err)) {
        logger.debug('PostgreSQL unavailable; aggregating dashboard stats in memory');
        return this.getStatsFromMemory(referenceDateStr);
      }
      throw err;
    }
  }

  private async getStatsFromDatabase(referenceDateStr?: string): Promise<DashboardStatsResponse> {
    const todayClause = referenceDateStr
      ? `$1::date`
      : `CURRENT_DATE`;
    const params = referenceDateStr ? [referenceDateStr] : [];

    // 1. Headline Metrics
    const headlineQuery = `
      SELECT
        COUNT(CASE WHEN o.is_archived = FALSE AND o.status IN ('placed', 'accepted', 'preparing', 'ready') THEN 1 END)::int AS open_orders,
        COUNT(CASE WHEN o.created_at::date = ${todayClause} THEN 1 END)::int AS orders_placed_today,
        COUNT(CASE WHEN o.status = 'served' AND (o.updated_at::date = ${todayClause} OR o.created_at::date = ${todayClause}) THEN 1 END)::int AS orders_served_today,
        COALESCE(SUM(CASE WHEN o.status = 'served' AND (o.updated_at::date = ${todayClause} OR o.created_at::date = ${todayClause}) THEN o.total_price ELSE 0 END), 0)::numeric AS revenue_today
      FROM orders o
    `;
    const { rows: headlineRows } = await dbPool.query(headlineQuery, params);
    const headlineRow = headlineRows[0] || {
      open_orders: 0,
      orders_placed_today: 0,
      orders_served_today: 0,
      revenue_today: 0,
    };

    const headline: HeadlineMetrics = {
      openOrders: parseInt(String(headlineRow.open_orders), 10) || 0,
      ordersPlacedToday: parseInt(String(headlineRow.orders_placed_today), 10) || 0,
      ordersServedToday: parseInt(String(headlineRow.orders_served_today), 10) || 0,
      revenueToday:
        Math.round((parseFloat(String(headlineRow.revenue_today)) || 0) * 100) / 100,
    };

    // 2. Status Breakdown
    const statusQuery = `
      SELECT o.status, COUNT(*)::int AS count
      FROM orders o
      WHERE o.is_archived = FALSE
      GROUP BY o.status
    `;
    const { rows: statusRows } = await dbPool.query(statusQuery);
    const statusCountMap = new Map<string, number>();
    for (const row of statusRows) {
      statusCountMap.set(row.status, parseInt(String(row.count), 10) || 0);
    }

    const statusBreakdown: StatusBreakdownItem[] = ALL_ORDER_STATUSES.map((status) => ({
      status,
      count: statusCountMap.get(status) || 0,
    }));

    // 3. Waiter Breakdown
    const waiterQuery = `
      SELECT
        u.id AS waiter_id,
        u.name AS waiter_name,
        u.email AS waiter_email,
        COUNT(o.id)::int AS order_count,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_price ELSE 0 END), 0)::numeric AS total_revenue
      FROM users u
      LEFT JOIN orders o ON o.primary_waiter_id = u.id AND o.is_archived = FALSE
      WHERE u.role = 'waiter'
      GROUP BY u.id, u.name, u.email
      ORDER BY order_count DESC, total_revenue DESC, u.name ASC
    `;
    const { rows: waiterRows } = await dbPool.query(waiterQuery);
    const waiterBreakdown: WaiterBreakdownItem[] = waiterRows.map((row) => ({
      waiterId: row.waiter_id,
      waiterName: row.waiter_name,
      waiterEmail: row.waiter_email,
      orderCount: parseInt(String(row.order_count), 10) || 0,
      totalRevenue:
        Math.round((parseFloat(String(row.total_revenue)) || 0) * 100) / 100,
    }));

    // 4. 14-Day Served Chart
    const chartQuery = `
      WITH date_series AS (
        SELECT (${todayClause} - (n || ' days')::interval)::date AS day
        FROM generate_series(0, 13) AS n
      )
      SELECT
        ds.day::text AS date,
        COUNT(o.id)::int AS count
      FROM date_series ds
      LEFT JOIN orders o ON (o.updated_at::date = ds.day OR o.created_at::date = ds.day) AND o.status = 'served'
      GROUP BY ds.day
      ORDER BY ds.day ASC
    `;
    const { rows: chartRows } = await dbPool.query(chartQuery, params);
    const dailyServedChart: DailyServedPoint[] = chartRows.map((row) => ({
      date: typeof row.date === 'string' ? row.date.substring(0, 10) : formatDateYMD(new Date(row.date)),
      count: parseInt(String(row.count), 10) || 0,
    }));

    return {
      headline,
      statusBreakdown,
      waiterBreakdown,
      dailyServedChart,
    };
  }

  private async getStatsFromMemory(referenceDateStr?: string): Promise<DashboardStatsResponse> {
    const orders: DbOrder[] = orderRepository.getAllOrdersForMemory();
    const waiters = await userRepository.findAllByRole('waiter');

    const refDate = referenceDateStr ? new Date(`${referenceDateStr}T00:00:00Z`) : new Date();
    const todayYMD = formatDateYMD(refDate);

    // 1. Headline Metrics
    let openOrders = 0;
    let ordersPlacedToday = 0;
    let ordersServedToday = 0;
    let revenueToday = 0;

    for (const order of orders) {
      const orderCreatedDate =
        order.created_at instanceof Date
          ? formatDateYMD(order.created_at)
          : String(order.created_at).substring(0, 10);

      const orderUpdatedDate =
        order.updated_at instanceof Date
          ? formatDateYMD(order.updated_at)
          : String(order.updated_at).substring(0, 10);

      const price =
        typeof order.total_price === 'number'
          ? order.total_price
          : parseFloat(String(order.total_price)) || 0;

      // Open orders: non-archived, in active non-terminal statuses
      if (
        !order.is_archived &&
        ['placed', 'accepted', 'preparing', 'ready'].includes(order.status)
      ) {
        openOrders++;
      }

      // Placed today
      if (orderCreatedDate === todayYMD) {
        ordersPlacedToday++;
      }

      // Served today & revenue
      if (
        order.status === 'served' &&
        (orderUpdatedDate === todayYMD || orderCreatedDate === todayYMD)
      ) {
        ordersServedToday++;
        revenueToday += price;
      }
    }

    const headline: HeadlineMetrics = {
      openOrders,
      ordersPlacedToday,
      ordersServedToday,
      revenueToday: Math.round(revenueToday * 100) / 100,
    };

    // 2. Status Breakdown
    const statusCountMap = new Map<OrderStatus, number>();
    for (const status of ALL_ORDER_STATUSES) {
      statusCountMap.set(status, 0);
    }
    for (const order of orders) {
      if (!order.is_archived) {
        statusCountMap.set(
          order.status,
          (statusCountMap.get(order.status) || 0) + 1
        );
      }
    }
    const statusBreakdown: StatusBreakdownItem[] = ALL_ORDER_STATUSES.map((status) => ({
      status,
      count: statusCountMap.get(status) || 0,
    }));

    // 3. Waiter Breakdown
    const waiterStats = new Map<
      string,
      { waiterName: string; waiterEmail: string; orderCount: number; totalRevenue: number }
    >();

    for (const waiter of waiters) {
      waiterStats.set(waiter.id, {
        waiterName: waiter.name,
        waiterEmail: waiter.email,
        orderCount: 0,
        totalRevenue: 0,
      });
    }

    for (const order of orders) {
      if (order.is_archived) continue;
      const waiterId = order.primary_waiter_id;
      const price =
        typeof order.total_price === 'number'
          ? order.total_price
          : parseFloat(String(order.total_price)) || 0;

      if (!waiterStats.has(waiterId)) {
        waiterStats.set(waiterId, {
          waiterName: order.primary_waiter_name || 'Unknown Waiter',
          waiterEmail: order.primary_waiter_email || '',
          orderCount: 0,
          totalRevenue: 0,
        });
      }

      const current = waiterStats.get(waiterId)!;
      current.orderCount++;
      if (order.status !== 'cancelled') {
        current.totalRevenue += price;
      }
    }

    const waiterBreakdown: WaiterBreakdownItem[] = Array.from(waiterStats.entries())
      .map(([waiterId, data]) => ({
        waiterId,
        waiterName: data.waiterName,
        waiterEmail: data.waiterEmail,
        orderCount: data.orderCount,
        totalRevenue: Math.round(data.totalRevenue * 100) / 100,
      }))
      .sort((a, b) => {
        if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
        if (b.totalRevenue !== a.totalRevenue) return b.totalRevenue - a.totalRevenue;
        return a.waiterName.localeCompare(b.waiterName);
      });

    // 4. 14-Day Served Chart
    const dailyServedMap = new Map<string, number>();
    const dates14: string[] = [];

    // Generate last 14 days ascending: [today - 13 days, ..., today]
    for (let i = 13; i >= 0; i--) {
      const d = new Date(refDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = formatDateYMD(d);
      dates14.push(dateStr);
      dailyServedMap.set(dateStr, 0);
    }

    for (const order of orders) {
      if (order.status === 'served') {
        const orderUpdatedDate =
          order.updated_at instanceof Date
            ? formatDateYMD(order.updated_at)
            : String(order.updated_at).substring(0, 10);
        const orderCreatedDate =
          order.created_at instanceof Date
            ? formatDateYMD(order.created_at)
            : String(order.created_at).substring(0, 10);

        const targetDate = dailyServedMap.has(orderUpdatedDate)
          ? orderUpdatedDate
          : orderCreatedDate;

        if (dailyServedMap.has(targetDate)) {
          dailyServedMap.set(targetDate, (dailyServedMap.get(targetDate) || 0) + 1);
        }
      }
    }

    const dailyServedChart: DailyServedPoint[] = dates14.map((date) => ({
      date,
      count: dailyServedMap.get(date) || 0,
    }));

    return {
      headline,
      statusBreakdown,
      waiterBreakdown,
      dailyServedChart,
    };
  }
}

export const dashboardRepository = new DashboardRepository();
