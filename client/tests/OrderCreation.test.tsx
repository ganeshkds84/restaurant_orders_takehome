import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../src/App';

const mockWaiterUser = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'waiter@restaurant.com',
  name: 'Sam Chen (Waiter)',
  role: 'waiter',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockMenuItems = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Truffle Fries',
    description: 'Crispy hand-cut fries tossed with white truffle oil',
    category: 'Appetizers',
    price: 9.5,
    isAvailable: true,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    name: 'Margherita Pizza',
    description: 'San Marzano tomato sauce, fresh buffalo mozzarella',
    category: 'Mains',
    price: 16.5,
    isAvailable: true,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockOrders = [
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
    createdAt: '2026-01-01T12:00:00Z',
    updatedAt: '2026-01-01T12:00:00Z',
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
        createdAt: '2026-01-01T12:00:00Z',
        updatedAt: '2026-01-01T12:00:00Z',
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
        createdAt: '2026-01-01T12:00:00Z',
        updatedAt: '2026-01-01T12:00:00Z',
      },
    ],
  },
];

describe('Order Creation & Order Lines Frontend UI (Phase 4)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('restaurant_auth_token', 'mock-waiter-token');
    vi.restoreAllMocks();

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

        // Orders GET

        if (url.includes('/orders') && (!options || options.method === 'GET' || !options.method)) {
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

        // Orders POST
        if (url.includes('/orders') && options?.method === 'POST') {
          const body = JSON.parse(String(options.body));
          const createdOrder = {
            id: 'o-new-uuid-1234',
            tableNumber: body.tableNumber,
            primaryWaiterId: mockWaiterUser.id,
            primaryWaiter: {
              id: mockWaiterUser.id,
              name: mockWaiterUser.name,
              email: mockWaiterUser.email,
            },
            status: 'placed',
            isArchived: false,
            totalPrice: 26.0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lines: body.items.map((it: any, idx: number) => ({
              id: `line-${idx}`,
              orderId: 'o-new-uuid-1234',
              menuItemId: it.menuItemId,
              itemName: it.menuItemId.includes('001') ? 'Truffle Fries' : 'Margherita Pizza',
              quantity: it.quantity,
              unitPrice: it.menuItemId.includes('001') ? 9.5 : 16.5,
              lineTotal: it.menuItemId.includes('001') ? 9.5 * it.quantity : 16.5 * it.quantity,
              specialInstructions: it.specialInstructions || '',
              isVoided: false,
              voidReason: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })),
          };

          return Promise.resolve({
            ok: true,
            status: 201,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { order: createdOrder },
              }),
          });
        }

        // Menu GET
        if (url.includes('/menu') && (!options || options.method === 'GET' || !options.method)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { items: mockMenuItems, count: mockMenuItems.length },
              }),
          });
        }

        return Promise.reject(new Error(`Unhandled request URL: ${url}`));
      })
    );
  });

  it('1. Renders Order Creation screen with available menu items', async () => {
    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('tab-create-order')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('tab-create-order'));
    });

    await waitFor(() => {
      expect(screen.getByText('Create New Order')).toBeInTheDocument();
    });

    expect(screen.getByText('Truffle Fries')).toBeInTheDocument();
    expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
    expect(screen.getByText('Table Identifier *')).toBeInTheDocument();
  });

  it('2. Adds items to order ticket, enters special instructions, and calculates running subtotal preview', async () => {
    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('tab-create-order')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('tab-create-order'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('add-item-btn-a0000000-0000-0000-0000-000000000001')).toBeInTheDocument();
    });

    // Add Truffle Fries (9.50)
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-item-btn-a0000000-0000-0000-0000-000000000001'));
    });

    // Check preview total is $9.50
    expect(screen.getByTestId('order-preview-total')).toHaveTextContent('$9.50');

    // Add Margherita Pizza (16.50)
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-item-btn-a0000000-0000-0000-0000-000000000003'));
    });

    // Subtotal preview is $26.00
    expect(screen.getByTestId('order-preview-total')).toHaveTextContent('$26.00');

    // Type special instructions
    const instructionInput = screen.getByTestId('instruction-input-a0000000-0000-0000-0000-000000000001');
    fireEvent.change(instructionInput, { target: { value: 'Extra crispy' } });
    expect(instructionInput).toHaveValue('Extra crispy');
  });

  it('3. Submits order and displays server-confirmed authoritative total and historical price snapshot', async () => {
    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('tab-create-order')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('tab-create-order'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('add-item-btn-a0000000-0000-0000-0000-000000000001')).toBeInTheDocument();
    });

    // Enter Table Number
    const tableInput = screen.getByTestId('order-table-number-input');
    fireEvent.change(tableInput, { target: { value: 'Table 9' } });

    // Add Truffle Fries
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-item-btn-a0000000-0000-0000-0000-000000000001'));
    });

    // Submit Order
    await act(async () => {
      fireEvent.click(screen.getByTestId('submit-order-btn'));
    });

    // Verify success banner appears with authoritative total
    await waitFor(() => {
      expect(screen.getByTestId('order-created-success')).toBeInTheDocument();
    });

    expect(screen.getByText(/Order Successfully Created!/i)).toBeInTheDocument();
    expect(screen.getByTestId('created-order-total')).toHaveTextContent('$26.00');
  });

  it('4. Navigates to Active Orders tab and views existing orders with line items', async () => {
    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('tab-orders')).toBeInTheDocument();
    });

    // Click Active Orders Tab
    await act(async () => {
      fireEvent.click(screen.getByTestId('tab-orders'));
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Active Orders' })).toBeInTheDocument();
      expect(screen.getByText('Table 4')).toBeInTheDocument();
    });

    expect(screen.getByTestId('order-total-o0000000-0000-0000-0000-000000000001')).toHaveTextContent('$26.00');
  });
});
