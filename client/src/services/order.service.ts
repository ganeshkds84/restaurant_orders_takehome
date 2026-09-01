import { config } from '../config/env';
import { Order, CreateOrderPayload, OrderFilters, PaginatedOrdersResponse } from '../types/order';

const API_BASE = config.apiBaseUrl;

interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  details?: Record<string, string[]>;
}

export async function fetchOrdersApi(
  token: string,
  filters?: OrderFilters
): Promise<PaginatedOrdersResponse> {
  const query = new URLSearchParams();
  if (filters?.search) query.append('search', filters.search);
  if (filters?.status) query.append('status', filters.status);
  if (filters?.waiterId) query.append('waiterId', filters.waiterId);
  if (filters?.date) query.append('date', filters.date);
  if (filters?.sortBy) query.append('sortBy', filters.sortBy);
  if (filters?.sortOrder) query.append('sortOrder', filters.sortOrder);
  if (filters?.page) query.append('page', String(filters.page));
  if (filters?.limit) query.append('limit', String(filters.limit));

  const url = `${API_BASE}/orders${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await response.json()) as ApiResponse<{
    orders: Order[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    count?: number;
  }>;
  if (!response.ok || body.status !== 'success' || !body.data) {
    throw new Error(body.message || 'Failed to fetch orders');
  }

  const orders = body.data.orders || [];
  const total =
    typeof body.data.total === 'number'
      ? body.data.total
      : (body.data.count ?? orders.length);
  const page = body.data.page ?? filters?.page ?? 1;
  const limit = body.data.limit ?? filters?.limit ?? 10;
  const totalPages =
    typeof body.data.totalPages === 'number'
      ? body.data.totalPages
      : Math.ceil(total / limit);

  return {
    orders,
    total,
    page,
    limit,
    totalPages,
  };
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

export async function fetchEligibleWaitersApi(
  token: string
): Promise<Array<{ id: string; name: string; email: string; role: string }>> {
  const response = await fetch(`${API_BASE}/orders/eligible-waiters`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await response.json()) as ApiResponse<{
    waiters: Array<{ id: string; name: string; email: string; role: string }>;
  }>;
  if (!response.ok || body.status !== 'success' || !body.data?.waiters) {
    throw new Error(body.message || 'Failed to fetch eligible waiters');
  }

  return body.data.waiters;
}

export async function fetchCollaboratorsApi(
  token: string,
  orderId: string
): Promise<Array<{ id: string; orderId: string; userId: string; user?: { id: string; name: string; email: string; role: string }; createdAt: string }>> {
  const response = await fetch(`${API_BASE}/orders/${orderId}/collaborators`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await response.json()) as ApiResponse<{
    collaborators: Array<{ id: string; orderId: string; userId: string; user?: { id: string; name: string; email: string; role: string }; createdAt: string }>;
  }>;
  if (!response.ok || body.status !== 'success' || !body.data?.collaborators) {
    throw new Error(body.message || 'Failed to fetch collaborators');
  }

  return body.data.collaborators;
}

export async function addCollaboratorApi(
  token: string,
  orderId: string,
  userId: string
): Promise<{ id: string; orderId: string; userId: string }> {
  const response = await fetch(`${API_BASE}/orders/${orderId}/collaborators`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId }),
  });

  const body = (await response.json()) as ApiResponse<{
    collaborator: { id: string; orderId: string; userId: string };
  }>;
  if (!response.ok || body.status !== 'success' || !body.data?.collaborator) {
    throw new Error(body.message || 'Failed to add collaborator');
  }

  return body.data.collaborator;
}

export async function removeCollaboratorApi(
  token: string,
  orderId: string,
  userId: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/orders/${orderId}/collaborators/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  if (!response.ok || body.status !== 'success') {
    throw new Error(body.message || 'Failed to remove collaborator');
  }
}


