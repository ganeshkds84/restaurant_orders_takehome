import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../src/App';

describe('Frontend Authentication UI & Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/health')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'healthy',
                timestamp: '2026-08-30T12:00:00Z',
                uptimeSeconds: 10,
                environment: 'test',
                version: '1.0.0',
                database: { connected: true },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      })
    );
  });

  it('renders login form with inputs and quick demo buttons', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/Quick Fill Demo Credentials/i)).toBeInTheDocument();
  });

  it('populates fields when clicking demo manager button', async () => {
    await act(async () => {
      render(<App />);
    });

    const managerDemoBtn = screen.getByText(/Alex Rivera \(Manager\)|manager@restaurant\.com/i);
    fireEvent.click(managerDemoBtn);

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

    expect(emailInput.value).toBe('manager@restaurant.com');
    expect(passwordInput.value).toBe('ManagerPassword123!');
  });

  it('populates fields when clicking demo waiter button', async () => {
    await act(async () => {
      render(<App />);
    });

    const waiterDemoBtn = screen.getByText(/Sam Chen \(Waiter\)|waiter@restaurant\.com/i);
    fireEvent.click(waiterDemoBtn);

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

    expect(emailInput.value).toBe('waiter@restaurant.com');
    expect(passwordInput.value).toBe('WaiterPassword123!');
  });

  it('validates empty email and password submission', async () => {
    await act(async () => {
      render(<App />);
    });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/please enter your email address/i)).toBeInTheDocument();
  });

  it('handles successful login and renders authenticated dashboard with role badge', async () => {
    const mockUser = {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'manager@restaurant.com',
      name: 'Alex Rivera (Manager)',
      role: 'manager',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/auth/login')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: {
                  token: 'mock-jwt-token-12345',
                  user: mockUser,
                },
              }),
          });
        }
        if (url.includes('/health')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'healthy',
                timestamp: '2026-08-30T12:00:00Z',
                uptimeSeconds: 10,
                environment: 'test',
                version: '1.0.0',
                database: { connected: true },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      })
    );

    await act(async () => {
      render(<App />);
    });

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'manager@restaurant.com' } });
    fireEvent.change(passwordInput, { target: { value: 'ManagerPassword123!' } });
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Alex Rivera/i)).toBeInTheDocument();
      expect(screen.getAllByText('MANAGER').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });
  });

  it('allows user to sign out and returns to login form', async () => {
    localStorage.setItem('restaurant_auth_token', 'existing-token-abc');

    const mockUser = {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'waiter@restaurant.com',
      name: 'Sam Chen (Waiter)',
      role: 'waiter',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { user: mockUser },
              }),
          });
        }
        if (url.includes('/auth/logout')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'success' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'healthy',
              database: { connected: true },
            }),
        });
      })
    );

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Sam Chen/i)).toBeInTheDocument();
      expect(screen.getAllByText('WAITER').length).toBeGreaterThan(0);
    });

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    await act(async () => {
      fireEvent.click(signOutBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('System Sign In')).toBeInTheDocument();
      expect(localStorage.getItem('restaurant_auth_token')).toBeNull();
    });
  });
});
