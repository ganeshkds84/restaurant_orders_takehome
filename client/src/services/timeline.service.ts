import { config } from '../config/env';
import { ApiResponse } from '../types/auth';
import { OrderAuditEvent } from '../types/timeline';

const API_BASE = config.apiBaseUrl;

export async function fetchOrderTimeline(token: string, orderId: string): Promise<OrderAuditEvent[]> {
  const url = `${API_BASE}/orders/${orderId}/timeline`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await response.json()) as ApiResponse<{ timeline: OrderAuditEvent[]; events?: OrderAuditEvent[] }>;

  if (!response.ok || body.status !== 'success' || !body.data) {
    throw new Error(body.message || 'Failed to fetch order history timeline.');
  }

  return body.data.timeline || body.data.events || [];
}
