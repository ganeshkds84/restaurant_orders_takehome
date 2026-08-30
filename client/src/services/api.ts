import { config } from '../config/env';
import { ApiResponse, AuthSuccessData, LoginCredentials, User } from '../types/auth';

const API_BASE = config.apiBaseUrl;

export async function loginApi(credentials: LoginCredentials): Promise<AuthSuccessData> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const body = (await response.json()) as ApiResponse<AuthSuccessData>;

  if (!response.ok || body.status !== 'success' || !body.data) {
    throw new Error(body.message || 'Login failed. Please check your credentials.');
  }

  return body.data;
}

export async function getMeApi(token: string): Promise<User> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await response.json()) as ApiResponse<{ user: User }>;

  if (!response.ok || body.status !== 'success' || !body.data?.user) {
    throw new Error(body.message || 'Session expired or invalid.');
  }

  return body.data.user;
}

export async function logoutApi(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    console.warn('Logout request failed or network offline', err);
  }
}

export async function testRbacEndpoint(endpoint: 'manager-only' | 'waiter-only' | 'staff-only', token: string) {
  const response = await fetch(`${API_BASE}/test-rbac/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await response.json();
  return {
    status: response.status,
    ok: response.ok,
    body,
  };
}
