import { OrderStatus } from './order.js';

export interface SlowOrderAlert {
  orderId: string;
  tableNumber: string;
  status: OrderStatus;
  primaryWaiterId: string;
  primaryWaiterName: string;
  totalPrice: number;
  createdAt: string;
  elapsedMinutes: number;
  thresholdMinutes: number;
  overdueMinutes: number;
  isReAlert: boolean;
  lastAcknowledgedAt: string | null;
  lastAcknowledgedByName: string | null;
  collaborators: Array<{ id: string; name: string }>;
}

export interface SlowOrderAlertsResponse {
  alerts: SlowOrderAlert[];
  count: number;
  thresholdMinutes: number;
  reAlertMinutes: number;
}

export interface OrderAlertAcknowledgement {
  id: string;
  orderId: string;
  userId: string;
  userName?: string;
  acknowledgedAt: string;
  notes?: string | null;
}

export interface DbOrderAlertAcknowledgement {
  id: string;
  order_id: string;
  user_id: string;
  acknowledged_at: Date;
  notes: string | null;
}
