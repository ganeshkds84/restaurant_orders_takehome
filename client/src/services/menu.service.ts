import { config } from '../config/env';
import {
  MenuItem,
  CreateMenuItemPayload,
  UpdateMenuItemPayload,
  MenuFilterOptions,
} from '../types/menu';

const API_BASE = config.apiBaseUrl;

interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  details?: Record<string, string[]>;
}

export async function fetchMenuItemsApi(
  token: string,
  filters: MenuFilterOptions = {}
): Promise<MenuItem[]> {
  const query = new URLSearchParams();
  if (filters.category) query.append('category', filters.category);
  if (filters.includeArchived) query.append('includeArchived', 'true');
  if (filters.isAvailable !== undefined) query.append('isAvailable', String(filters.isAvailable));

  const url = `${API_BASE}/menu${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await response.json()) as ApiResponse<{ items: MenuItem[]; count: number }>;
  if (!response.ok || body.status !== 'success' || !body.data) {
    throw new Error(body.message || 'Failed to fetch menu items');
  }

  return body.data.items;
}

export async function createMenuItemApi(
  token: string,
  payload: CreateMenuItemPayload
): Promise<MenuItem> {
  const response = await fetch(`${API_BASE}/menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as ApiResponse<{ item: MenuItem }>;
  if (!response.ok || body.status !== 'success' || !body.data?.item) {
    const errorDetails = body.details ? Object.values(body.details).flat().join(', ') : '';
    throw new Error(errorDetails ? `${body.message}: ${errorDetails}` : body.message || 'Failed to create menu item');
  }

  return body.data.item;
}

export async function updateMenuItemApi(
  token: string,
  id: string,
  payload: UpdateMenuItemPayload
): Promise<MenuItem> {
  const response = await fetch(`${API_BASE}/menu/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as ApiResponse<{ item: MenuItem }>;
  if (!response.ok || body.status !== 'success' || !body.data?.item) {
    const errorDetails = body.details ? Object.values(body.details).flat().join(', ') : '';
    throw new Error(errorDetails ? `${body.message}: ${errorDetails}` : body.message || 'Failed to update menu item');
  }

  return body.data.item;
}

export async function toggleMenuItemAvailabilityApi(
  token: string,
  id: string,
  isAvailable: boolean
): Promise<MenuItem> {
  const response = await fetch(`${API_BASE}/menu/${id}/availability`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isAvailable }),
  });

  const body = (await response.json()) as ApiResponse<{ item: MenuItem }>;
  if (!response.ok || body.status !== 'success' || !body.data?.item) {
    throw new Error(body.message || 'Failed to update availability');
  }

  return body.data.item;
}

export async function toggleMenuItemArchiveApi(
  token: string,
  id: string,
  isArchived: boolean
): Promise<MenuItem> {
  const response = await fetch(`${API_BASE}/menu/${id}/archive`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isArchived }),
  });

  const body = (await response.json()) as ApiResponse<{ item: MenuItem }>;
  if (!response.ok || body.status !== 'success' || !body.data?.item) {
    throw new Error(body.message || 'Failed to update archive status');
  }

  return body.data.item;
}
