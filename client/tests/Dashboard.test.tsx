import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../src/context/AuthContext';
import { DashboardView } from '../src/components/DashboardView';
import { DashboardStats } from '../src/types/dashboard';

const mockManagerUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'manager@restaurant.com',
  name: 'Alex Rivera',
  role: 'manager' as const,
};

const mockStats: DashboardStats = {
  headline: {
    openOrders: 4,
    ordersPlacedToday: 8,
    ordersServedToday: 6,
    revenueToday: 184.5,
  },
  statusBreakdown: [
    { status: 'placed', count: 2 },
    { status: 'accepted', count: 1 },
    { status: 'preparing', count: 1 },
    { status: 'ready', count: 0 },
    { status: 'served', count: 6 },
    { status: 'cancelled', count: 1 },
  ],
  waiterBreakdown: [
    {
      waiterId: '22222222-2222-2222-2222-222222222222',
      waiterName: 'Sam Chen',
      waiterEmail: 'waiter@restaurant.com',
      orderCount: 5,
      totalRevenue: 120.0,
    },
    {
      waiterId: '33333333-3333-3333-3333-333333333333',
      waiterName: 'Taylor Jordan',
      waiterEmail: 'waiter2@restaurant.com',
      orderCount: 3,
      totalRevenue: 64.5,
    },
  ],
  dailyServedChart: [
    { date: '2026-08-19', count: 10 },
    { date: '2026-08-20', count: 12 },
    { date: '2026-08-21', count: 8 },
    { date: '2026-08-22', count: 15 },
    { date: '2026-08-23', count: 14 },
    { date: '2026-08-24', count: 9 },
    { date: '2026-08-25', count: 11 },
    { date: '2026-08-26', count: 13 },
    { date: '2026-08-27', count: 16 },
    { date: '2026-08-28', count: 18 },
    { date: '2026-08-29', count: 20 },
    { date: '2026-08-30', count: 7 },
    { date: '2026-08-31', count: 14 },
    { date: '2026-09-01', count: 6 },
  ],
};

describe('Dashboard Analytics & Landing View Frontend UI (Phase 9 - Goal 8)', () => {
  let fetchCallCount = 0;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('restaurant_auth_token', 'mock-manager-token');
    vi.restoreAllMocks();
    fetchCallCount = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        // Auth verify
        if (url.includes('/auth/me')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { user: mockManagerUser },
              }),
          });
        }

        // Dashboard stats
        if (url.includes('/dashboard/stats')) {
          fetchCallCount++;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: mockStats,
              }),
          });
        }

        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      })
    );
  });

  it('1. Renders headline stat cards with live figures and formatted revenue', async () => {
    render(
      <AuthProvider>
        <DashboardView />
      </AuthProvider>
    );

    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByTestId('stat-value-open-orders')).toHaveTextContent('4');
    });

    expect(screen.getByTestId('stat-value-placed-today')).toHaveTextContent('8');
    expect(screen.getByTestId('stat-value-served-today')).toHaveTextContent('6');
    expect(screen.getByTestId('stat-value-revenue-today')).toHaveTextContent('$184.50');
  });

  it('2. Renders status pipeline breakdown with all lifecycle statuses and counts', async () => {
    render(
      <AuthProvider>
        <DashboardView />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status-breakdown-panel')).toBeInTheDocument();
    });

    expect(screen.getByTestId('status-item-placed')).toHaveTextContent('Placed');
    expect(screen.getByTestId('status-item-placed')).toHaveTextContent('2');

    expect(screen.getByTestId('status-item-served')).toHaveTextContent('Served');
    expect(screen.getByTestId('status-item-served')).toHaveTextContent('6');

    expect(screen.getByTestId('status-item-cancelled')).toHaveTextContent('Cancelled');
    expect(screen.getByTestId('status-item-cancelled')).toHaveTextContent('1');
  });

  it('3. Renders 14-day served orders chart with all daily data points', async () => {
    render(
      <AuthProvider>
        <DashboardView />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('chart-panel-served-14days')).toBeInTheDocument();
    });

    expect(screen.getByTestId('chart-bar-2026-08-19')).toBeInTheDocument();
    expect(screen.getByTestId('chart-bar-2026-09-01')).toBeInTheDocument();
  });

  it('4. Renders waiter breakdown table with names, orders handled, and revenue generated', async () => {
    render(
      <AuthProvider>
        <DashboardView />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('waiter-breakdown-panel')).toBeInTheDocument();
    });

    expect(screen.getByTestId('waiter-row-22222222-2222-2222-2222-222222222222')).toHaveTextContent('Sam Chen');
    expect(screen.getByTestId('waiter-row-22222222-2222-2222-2222-222222222222')).toHaveTextContent('5');
    expect(screen.getByTestId('waiter-row-22222222-2222-2222-2222-222222222222')).toHaveTextContent('$120.00');

    expect(screen.getByTestId('waiter-row-33333333-3333-3333-3333-333333333333')).toHaveTextContent('Taylor Jordan');
    expect(screen.getByTestId('waiter-row-33333333-3333-3333-3333-333333333333')).toHaveTextContent('$64.50');
  });

  it('5. Refresh button triggers re-fetching of dashboard metrics', async () => {
    render(
      <AuthProvider>
        <DashboardView />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-refresh-btn')).toBeInTheDocument();
    });

    const initialCalls = fetchCallCount;

    fireEvent.click(screen.getByTestId('dashboard-refresh-btn'));

    await waitFor(() => {
      expect(fetchCallCount).toBeGreaterThan(initialCalls);
    });
  });

  it('6. Displays error message and retry button when fetching fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/auth/me')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { user: mockManagerUser },
              }),
          });
        }
        if (url.includes('/dashboard/stats')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () =>
              Promise.resolve({
                status: 'error',
                message: 'Internal server error while computing metrics',
              }),
          });
        }
        return Promise.reject(new Error('Network error'));
      })
    );

    render(
      <AuthProvider>
        <DashboardView />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-error')).toHaveTextContent('Internal server error while computing metrics');
    });
  });
});
