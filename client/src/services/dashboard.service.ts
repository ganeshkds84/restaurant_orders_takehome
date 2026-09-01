import { config } from '../config/env';
import { ApiResponse } from '../types/auth';
import { DashboardStats } from '../types/dashboard';

const API_BASE = config.apiBaseUrl;

export async function fetchDashboardStats(token: string, dateStr?: string): Promise<DashboardStats> {
  const url = dateStr
    ? `${API_BASE}/dashboard/stats?date=${encodeURIComponent(dateStr)}`
    : `${API_BASE}/dashboard/stats`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await response.json()) as ApiResponse<DashboardStats>;

  if (!response.ok || body.status !== 'success' || !body.data) {
    throw new Error(body.message || 'Failed to fetch dashboard statistics.');
  }

  return body.data;
}
