import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../src/context/AuthContext';
import { OrderList } from '../src/components/OrderList';
import { Order } from '../src/types/order';
import { OrderAuditEvent } from '../src/types/timeline';

const mockManagerUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'manager@restaurant.com',
  name: 'Alex Rivera (Manager)',
  role: 'manager' as const,
};

const mockOrder: Order = {
  id: 'ord-100',
  tableNumber: 'Table 4',
  primaryWaiterId: '22222222-2222-2222-2222-222222222222',
  primaryWaiter: {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Sam Chen (Waiter)',
    email: 'waiter@restaurant.com',
  },
  collaborators: [],
  status: 'preparing',
  isArchived: false,
  totalPrice: 46.5,
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:15:00.000Z',
  lines: [
    {
      id: 'line-1',
      orderId: 'ord-100',
      menuItemId: 'item-1',
      itemName: 'Ribeye Steak',
      quantity: 1,
      unitPrice: 34.5,
      lineTotal: 34.5,
      specialInstructions: 'Medium rare',
      isVoided: false,
      voidReason: null,
      createdAt: '2026-09-01T12:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
    },
    {
      id: 'line-2',
      orderId: 'ord-100',
      menuItemId: 'item-2',
      itemName: 'Cabernet Sauvignon',
      quantity: 1,
      unitPrice: 12.0,
      lineTotal: 12.0,
      specialInstructions: '',
      isVoided: false,
      voidReason: null,
      createdAt: '2026-09-01T12:05:00.000Z',
      updatedAt: '2026-09-01T12:05:00.000Z',
    },
  ],
};

const mockTimelineEvents: OrderAuditEvent[] = [
  {
    id: 'evt-1',
    orderId: 'ord-100',
    actorId: '22222222-2222-2222-2222-222222222222',
    actorName: 'Sam Chen (Waiter)',
    actorRole: 'waiter',
    eventType: 'order_created',
    oldStatus: null,
    newStatus: 'placed',
    itemName: null,
    quantity: null,
    unitPrice: null,
    reason: null,
    notes: 'Order created for Table 4 with 1 item(s)',
    createdAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'evt-2',
    orderId: 'ord-100',
    actorId: '22222222-2222-2222-2222-222222222222',
    actorName: 'Sam Chen (Waiter)',
    actorRole: 'waiter',
    eventType: 'status_changed',
    oldStatus: 'placed',
    newStatus: 'accepted',
    itemName: null,
    quantity: null,
    unitPrice: null,
    reason: null,
    notes: null,
    createdAt: '2026-09-01T12:02:00.000Z',
  },
  {
    id: 'evt-3',
    orderId: 'ord-100',
    actorId: '22222222-2222-2222-2222-222222222222',
    actorName: 'Sam Chen (Waiter)',
    actorRole: 'waiter',
    eventType: 'line_added',
    oldStatus: null,
    newStatus: null,
    itemName: 'Cabernet Sauvignon',
    quantity: 1,
    unitPrice: 12.0,
    reason: null,
    notes: 'Chilled glass',
    createdAt: '2026-09-01T12:05:00.000Z',
  },
  {
    id: 'evt-4',
    orderId: 'ord-100',
    actorId: '11111111-1111-1111-1111-111111111111',
    actorName: 'Alex Rivera (Manager)',
    actorRole: 'manager',
    eventType: 'status_changed',
    oldStatus: 'accepted',
    newStatus: 'preparing',
    itemName: null,
    quantity: null,
    unitPrice: null,
    reason: 'Fired to kitchen station 1',
    notes: null,
    createdAt: '2026-09-01T12:15:00.000Z',
  },
];

describe('Order Audit History Timeline Frontend UI (Phase 10 - Goal 9)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('restaurant_auth_token', 'mock-token');
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <AuthProvider>
        <OrderList />
      </AuthProvider>
    );
  };

  it('1. Renders Order History Timeline section within expanded order ticket', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'success', data: { user: mockManagerUser } }),
        } as Response);
      }
      if (urlStr.includes('/orders/eligible-waiters')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'success', data: { waiters: [] } }),
        } as Response);
      }
      if (urlStr.includes('/orders') && !urlStr.includes('/timeline')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: 'success',
              data: { order: mockOrder, orders: [mockOrder], total: 1, page: 1, limit: 10, totalPages: 1 },
            }),
        } as Response);
      }
      if (urlStr.includes('/timeline')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: 'success',
              data: { timeline: mockTimelineEvents },
            }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    }) as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Table 4')).toBeInTheDocument();
    });

    // Expand the order card
    const expandBtn = screen.getByTestId('expand-order-ord-100');
    fireEvent.click(expandBtn);

    // Verify timeline section is present
    expect(screen.getByTestId('order-timeline-section-ord-100')).toBeInTheDocument();
    expect(screen.getByText('Order History Timeline')).toBeInTheDocument();
  });

  it('2. Clicking timeline toggle fetches events and renders chronological event list with actor and status details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'success', data: { user: mockManagerUser } }),
        } as Response);
      }
      if (urlStr.includes('/orders/eligible-waiters')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'success', data: { waiters: [] } }),
        } as Response);
      }
      if (urlStr.includes('/orders') && !urlStr.includes('/timeline')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: 'success',
              data: { order: mockOrder, orders: [mockOrder], total: 1, page: 1, limit: 10, totalPages: 1 },
            }),
        } as Response);
      }
      if (urlStr.includes('/timeline')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: 'success',
              data: { timeline: mockTimelineEvents },
            }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    }) as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Table 4')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('expand-order-ord-100'));

    // Click toggle timeline button
    const toggleTimelineBtn = screen.getByTestId('btn-toggle-timeline-ord-100');
    fireEvent.click(toggleTimelineBtn);

    // Wait for events list to render
    await waitFor(() => {
      expect(screen.getByTestId('timeline-events-list-ord-100')).toBeInTheDocument();
    });

    // Verify event details
    expect(screen.getByText('Order created for Table 4 with 1 item(s)')).toBeInTheDocument();
    expect(screen.getByText(/Fired to kitchen station 1/)).toBeInTheDocument();
    expect(screen.getAllByText(/Cabernet Sauvignon/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('4 events')).toBeInTheDocument();
  });

  it('3. Displays line voided event with mandatory reason in timeline', async () => {
    const voidedTimelineEvents: OrderAuditEvent[] = [
      {
        id: 'evt-v1',
        orderId: 'ord-100',
        actorId: '11111111-1111-1111-1111-111111111111',
        actorName: 'Alex Rivera (Manager)',
        actorRole: 'manager',
        eventType: 'line_voided',
        oldStatus: null,
        newStatus: null,
        itemName: 'Ribeye Steak',
        quantity: 1,
        unitPrice: 34.5,
        reason: 'Customer requested cancellation before prep',
        notes: null,
        createdAt: '2026-09-01T12:10:00.000Z',
      },
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn((url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'success', data: { user: mockManagerUser } }),
        } as Response);
      }
      if (urlStr.includes('/orders/eligible-waiters')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'success', data: { waiters: [] } }),
        } as Response);
      }
      if (urlStr.includes('/orders') && !urlStr.includes('/timeline')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: 'success',
              data: { order: mockOrder, orders: [mockOrder], total: 1, page: 1, limit: 10, totalPages: 1 },
            }),
        } as Response);
      }
      if (urlStr.includes('/timeline')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: 'success',
              data: { timeline: voidedTimelineEvents },
            }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    }) as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Table 4')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('expand-order-ord-100'));
    fireEvent.click(screen.getByTestId('btn-toggle-timeline-ord-100'));

    await waitFor(() => {
      expect(screen.getByTestId('timeline-event-line_voided')).toBeInTheDocument();
      expect(screen.getByText(/Customer requested cancellation before prep/)).toBeInTheDocument();
    });
  });

  it('4. Handles timeline fetch error state gracefully with retry capability', async () => {
    let hasFailed = true;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'success', data: { user: mockManagerUser } }),
        } as Response);
      }
      if (urlStr.includes('/orders/eligible-waiters')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'success', data: { waiters: [] } }),
        } as Response);
      }
      if (urlStr.includes('/orders') && !urlStr.includes('/timeline')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: 'success',
              data: { order: mockOrder, orders: [mockOrder], total: 1, page: 1, limit: 10, totalPages: 1 },
            }),
        } as Response);
      }
      if (urlStr.includes('/timeline')) {
        if (hasFailed) {
          hasFailed = false;
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ status: 'error', message: 'Failed to connect to audit repository.' }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: 'success',
              data: { timeline: mockTimelineEvents },
            }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    }) as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Table 4')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('expand-order-ord-100'));
    fireEvent.click(screen.getByTestId('btn-toggle-timeline-ord-100'));

    // Verify error state
    await waitFor(() => {
      expect(screen.getByTestId('timeline-error-ord-100')).toBeInTheDocument();
      expect(screen.getByText('Failed to connect to audit repository.')).toBeInTheDocument();
    });

    // Click refresh button to retry
    const refreshBtn = screen.getByTestId('btn-refresh-timeline-ord-100');
    fireEvent.click(refreshBtn);

    // Verify successful recovery
    await waitFor(() => {
      expect(screen.getByTestId('timeline-events-list-ord-100')).toBeInTheDocument();
    });
  });
});
