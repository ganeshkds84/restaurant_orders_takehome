import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider } from '../src/context/AuthContext';
import { OrderList } from '../src/components/OrderList';
import { Order } from '../src/types/order';

const mockWaiterUser = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'waiter@restaurant.com',
  name: 'Sam Chen',
  role: 'waiter' as const,
};

const initialMockOrders: Order[] = [
  {
    id: 'o0000000-0000-0000-0000-000000000001',
    tableNumber: 'Table 4',
    primaryWaiterId: mockWaiterUser.id,
    primaryWaiter: {
      id: mockWaiterUser.id,
      name: mockWaiterUser.name,
      email: mockWaiterUser.email,
    },
    status: 'placed',
    isArchived: false,
    totalPrice: 26.0,
    createdAt: '2026-08-31T12:00:00.000Z',
    updatedAt: '2026-08-31T12:00:00.000Z',
    lines: [
      {
        id: 'l0000000-0000-0000-0000-000000000001',
        orderId: 'o0000000-0000-0000-0000-000000000001',
        menuItemId: 'a0000000-0000-0000-0000-000000000001',
        itemName: 'Truffle Fries',
        quantity: 1,
        unitPrice: 9.5,
        lineTotal: 9.5,
        specialInstructions: 'Extra crispy',
        isVoided: false,
        voidReason: null,
        createdAt: '2026-08-31T12:00:00.000Z',
        updatedAt: '2026-08-31T12:00:00.000Z',
      },
      {
        id: 'l0000000-0000-0000-0000-000000000002',
        orderId: 'o0000000-0000-0000-0000-000000000001',
        menuItemId: 'a0000000-0000-0000-0000-000000000003',
        itemName: 'Margherita Pizza',
        quantity: 1,
        unitPrice: 16.5,
        lineTotal: 16.5,
        specialInstructions: '',
        isVoided: false,
        voidReason: null,
        createdAt: '2026-08-31T12:00:00.000Z',
        updatedAt: '2026-08-31T12:00:00.000Z',
      },
    ],
  },
];

describe('Order Lifecycle & Voiding Frontend UI (Phase 5)', () => {
  let mockOrders: Order[];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('restaurant_auth_token', 'mock-waiter-token');
    vi.restoreAllMocks();
    mockOrders = JSON.parse(JSON.stringify(initialMockOrders));

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        // Health check
        if (url.includes('/health')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'ok',
                data: {
                  timestamp: new Date().toISOString(),
                  uptimeSeconds: 120,
                  environment: 'test',
                  database: { status: 'connected', latencyMs: 5 },
                },
              }),
          });
        }

        // Get me
        if (url.includes('/auth/me')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { user: mockWaiterUser },
              }),
          });
        }

        // Eligible waiters
        if (url.includes('/orders/eligible-waiters')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { waiters: [mockWaiterUser] },
              }),
          });
        }

        // Orders GET single or list

        if (url.includes('/orders') && (!options || options.method === 'GET' || !options.method)) {
          const matchSingle = url.match(/\/orders\/([a-z0-9-]+)$/i);
          if (matchSingle && matchSingle[1] && !url.includes('?')) {
            const singleOrder = mockOrders.find((o) => o.id === matchSingle[1]) || mockOrders[0];
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () =>
                Promise.resolve({
                  status: 'success',
                  data: { order: singleOrder },
                }),
            });
          }

          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { orders: mockOrders, count: mockOrders.length },
              }),
          });
        }

        // Orders Status PATCH
        if (url.includes('/status') && options?.method === 'PATCH') {
          const body = JSON.parse(String(options.body));
          mockOrders[0].status = body.status;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { order: mockOrders[0] },
              }),
          });
        }

        // Orders Cancel POST
        if (url.includes('/cancel') && options?.method === 'POST') {
          mockOrders[0].status = 'cancelled';
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { order: mockOrders[0] },
              }),
          });
        }

        // Void line PATCH
        if (url.includes('/void') && options?.method === 'PATCH') {
          const body = JSON.parse(String(options.body));
          const line = mockOrders[0].lines.find((l) => url.includes(l.id));
          if (line) {
            line.isVoided = true;
            line.voidReason = body.reason;
            mockOrders[0].totalPrice = mockOrders[0].lines
              .filter((l) => !l.isVoided)
              .reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { order: mockOrders[0] },
              }),
          });
        }

        return Promise.reject(new Error(`Unhandled request URL: ${url}`));
      })
    );
  });

  const renderOrderList = async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <OrderList />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Active Orders' })).toBeInTheDocument();
      expect(screen.getByText('Table 4')).toBeInTheDocument();
    });
  };

  it('1. Renders order in Placed status with Accept and Cancel action buttons', async () => {
    await renderOrderList();

    expect(screen.getByTestId('status-badge-placed')).toBeInTheDocument();
    expect(screen.getByTestId('btn-accept-o0000000-0000-0000-0000-000000000001')).toBeInTheDocument();
    expect(screen.getByTestId('btn-cancel-o0000000-0000-0000-0000-000000000001')).toBeInTheDocument();
  });

  it('2. Transitions order from Placed to Accepted on Accept click', async () => {
    await renderOrderList();

    const acceptBtn = screen.getByTestId('btn-accept-o0000000-0000-0000-0000-000000000001');
    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('status-badge-accepted')).toBeInTheDocument();
      expect(screen.getByTestId('btn-prepare-o0000000-0000-0000-0000-000000000001')).toBeInTheDocument();
    });
  });

  it('3. Cancels order from Placed state via cancel confirmation modal', async () => {
    await renderOrderList();

    const cancelBtn = screen.getByTestId('btn-cancel-o0000000-0000-0000-0000-000000000001');
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    // Verify Cancel Modal appears
    expect(screen.getByRole('heading', { name: /Cancel Table 4\?/i })).toBeInTheDocument();

    const reasonInput = screen.getByTestId('cancel-reason-input');
    fireEvent.change(reasonInput, { target: { value: 'Customer left' } });

    const confirmCancelBtn = screen.getByTestId('confirm-cancel-btn');
    await act(async () => {
      fireEvent.click(confirmCancelBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('status-badge-cancelled')).toBeInTheDocument();
      expect(screen.getByText('Order Cancelled')).toBeInTheDocument();
    });
  });

  it('4. Voids an order line item with a required reason, updating the authoritative total', async () => {
    await renderOrderList();

    // Toggle expand order details
    const orderHeader = screen.getByText('Table 4');
    await act(async () => {
      fireEvent.click(orderHeader);
    });

    // Check lines and void button
    await waitFor(() => {
      expect(screen.getByTestId('btn-void-line-l0000000-0000-0000-0000-000000000001')).toBeInTheDocument();
    });

    // Click Void button on Truffle Fries line
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-void-line-l0000000-0000-0000-0000-000000000001'));
    });

    // Verify Void Modal is open
    expect(screen.getByRole('heading', { name: /Void Item: Truffle Fries/i })).toBeInTheDocument();

    // Try submitting without reason -> validation error
    const confirmVoidBtn = screen.getByTestId('confirm-void-btn');
    await act(async () => {
      fireEvent.click(confirmVoidBtn);
    });
    expect(screen.getByText('A void reason is required.')).toBeInTheDocument();

    // Enter reason and submit
    const reasonInput = screen.getByTestId('void-reason-input');
    fireEvent.change(reasonInput, { target: { value: 'Customer allergic to truffle' } });

    await act(async () => {
      fireEvent.click(confirmVoidBtn);
    });

    // Verify line is voided and total updated to $16.50 (Margherita Pizza only)
    await waitFor(() => {
      expect(screen.getByTestId('badge-voided-l0000000-0000-0000-0000-000000000001')).toBeInTheDocument();
      expect(screen.getByTestId('void-reason-l0000000-0000-0000-0000-000000000001')).toHaveTextContent(
        'Void reason: Customer allergic to truffle'
      );
      expect(screen.getByTestId('order-total-o0000000-0000-0000-0000-000000000001')).toHaveTextContent('₹16.50');
    });
  });
});
