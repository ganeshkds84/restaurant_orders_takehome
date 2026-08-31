import { config } from '../config/env';
import { Order, CreateOrderPayload } from '../types/order';

const API_BASE = config.apiBaseUrl;

interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  details?: Record<string, string[]>;
}

export async function fetchOrdersApi(
  token: string,
  filters?: { tableNumber?: string; status?: string }
): Promise<Order[]> {
  const query = new URLSearchParams();
  if (filters?.tableNumber) query.append('tableNumber', filters.tableNumber);
  if (filters?.status) query.append('status', filters.status);

  const url = `${API_BASE}/orders${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await response.json()) as ApiResponse<{ orders: Order[]; count: number }>;
  if (!response.ok || body.status !== 'success' || !body.data) {
    throw new Error(body.message || 'Failed to fetch orders');
  }

  return body.data.orders;
}

export async function fetchOrderByIdApi(token: string, id: string): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await response.json()) as ApiResponse<{ order: Order }>;
  if (!response.ok || body.status !== 'success' || !body.data?.order) {
    throw new Error(body.message || 'Failed to fetch order');
  }

  return body.data.order;
}

export async function createOrderApi(
  token: string,
  payload: CreateOrderPayload
): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as ApiResponse<{ order: Order }>;
  if (!response.ok || body.status !== 'success' || !body.data?.order) {
    const errorDetails = body.details ? Object.values(body.details).flat().join(', ') : '';
    throw new Error(
      errorDetails
        ? `${body.message}: ${errorDetails}`
        : body.message || 'Failed to create order'
    );
  }

  return body.data.order;
}

export async function updateOrderStatusApi(
  token: string,
  id: string,
  status: string,
  reason?: string
): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status, reason }),
  });

  const body = (await response.json()) as ApiResponse<{ order: Order }>;
  if (!response.ok || body.status !== 'success' || !body.data?.order) {
    throw new Error(body.message || 'Failed to update order status');
  }

  return body.data.order;
}

export async function cancelOrderApi(
  token: string,
  id: string,
  reason?: string
): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders/${id}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  const body = (await response.json()) as ApiResponse<{ order: Order }>;
  if (!response.ok || body.status !== 'success' || !body.data?.order) {
    throw new Error(body.message || 'Failed to cancel order');
  }

  return body.data.order;
}

export async function voidOrderLineApi(
  token: string,
  orderId: string,
  lineId: string,
  reason: string
): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders/${orderId}/lines/${lineId}/void`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  const body = (await response.json()) as ApiResponse<{ order: Order }>;
  if (!response.ok || body.status !== 'success' || !body.data?.order) {
    throw new Error(body.message || 'Failed to void order line');
  }

  return body.data.order;
}

export async function addOrderLineApi(
  token: string,
  orderId: string,
  payload: { menuItemId: string; quantity: number; specialInstructions?: string }
): Promise<Order> {
  const response = await fetch(`${API_BASE}/orders/${orderId}/lines`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as ApiResponse<{ order: Order }>;
  if (!response.ok || body.status !== 'success' || !body.data?.order) {
    throw new Error(body.message || 'Failed to add item to order');
  }

  return body.data.order;
}

