import { OrderStatus } from './order.js';

export interface HeadlineMetrics {
  openOrders: number;
  ordersPlacedToday: number;
  ordersServedToday: number;
  revenueToday: number;
}

export interface StatusBreakdownItem {
  status: OrderStatus;
  count: number;
}

export interface WaiterBreakdownItem {
  waiterId: string;
  waiterName: string;
  waiterEmail: string;
  orderCount: number;
  totalRevenue: number;
}

export interface DailyServedPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface DashboardStats {
  headline: HeadlineMetrics;
  statusBreakdown: StatusBreakdownItem[];
  waiterBreakdown: WaiterBreakdownItem[];
  dailyServedChart: DailyServedPoint[];
}
