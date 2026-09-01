import { config } from '../config/env';
import { ApiResponse } from '../types/auth';
import { SlowOrderAlertsResponse, OrderAlertAcknowledgement } from '../types/alert';

const API_BASE = config.apiBaseUrl;

export async function fetchSlowOrderAlerts(
  token: string,
  params?: { thresholdMinutes?: number; reAlertMinutes?: number }
): Promise<SlowOrderAlertsResponse> {
  const query = new URLSearchParams();
  if (params?.thresholdMinutes) query.set('thresholdMinutes', String(params.thresholdMinutes));
  if (params?.reAlertMinutes) query.set('reAlertMinutes', String(params.reAlertMinutes));

  const url = query.toString() ? `${API_BASE}/orders/alerts?${query.toString()}` : `${API_BASE}/orders/alerts`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await response.json()) as ApiResponse<SlowOrderAlertsResponse>;

  if (!response.ok || body.status !== 'success' || !body.data) {
    throw new Error(body.message || 'Failed to fetch slow-order alerts.');
  }

  return body.data;
}

export async function acknowledgeOrderAlert(
  token: string,
  orderId: string,
  notes?: string
): Promise<OrderAlertAcknowledgement> {
  const url = `${API_BASE}/orders/${orderId}/alerts/acknowledge`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ notes }),
  });

  const body = (await response.json()) as ApiResponse<{ acknowledgement: OrderAlertAcknowledgement }>;

  if (!response.ok || body.status !== 'success' || !body.data) {
    throw new Error(body.message || 'Failed to acknowledge alert.');
  }

  return body.data.acknowledgement;
}
