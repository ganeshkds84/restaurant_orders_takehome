import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider } from '../src/context/AuthContext';
import { OrderList } from '../src/components/OrderList';
import { Order } from '../src/types/order';

const mockWaiter1 = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'waiter@restaurant.com',
  name: 'Sam Chen',
  role: 'waiter' as const,
};

const mockWaiter2 = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'waiter2@restaurant.com',
  name: 'Taylor Jordan',
  role: 'waiter' as const,
};

const mockWaiter3 = {
  id: '44444444-4444-4444-4444-444444444444',
  email: 'waiter3@restaurant.com',
  name: 'Morgan Blake',
  role: 'waiter' as const,
};

const eligibleWaitersList = [
  mockWaiter1,
  mockWaiter2,
  mockWaiter3,
];

const initialOrders: Order[] = [
  // Order 1: Waiter 1 is primary waiter, has no collaborators initially
  {
    id: 'o0000000-0000-0000-0000-000000000001',
    tableNumber: 'Table 10',
    primaryWaiterId: mockWaiter1.id,
    primaryWaiter: {
      id: mockWaiter1.id,
      name: mockWaiter1.name,
      email: mockWaiter1.email,
    },
    collaborators: [],
    status: 'placed',
    isArchived: false,
    totalPrice: 20.0,
    createdAt: '2026-08-31T12:00:00.000Z',
    updatedAt: '2026-08-31T12:00:00.000Z',
    lines: [
      {
        id: 'l0000000-0000-0000-0000-000000000001',
        orderId: 'o0000000-0000-0000-0000-000000000001',
        menuItemId: 'a0000000-0000-0000-0000-000000000001',
        itemName: 'Truffle Fries',
        quantity: 2,
        unitPrice: 10.0,
        lineTotal: 20.0,
        specialInstructions: '',
        isVoided: false,
        voidReason: null,
        createdAt: '2026-08-31T12:00:00.000Z',
        updatedAt: '2026-08-31T12:00:00.000Z',
      },
    ],
  },
  // Order 2: Waiter 2 is primary waiter, Waiter 1 is assigned as collaborator
  {
    id: 'o0000000-0000-0000-0000-000000000002',
    tableNumber: 'Table 12',
    primaryWaiterId: mockWaiter2.id,
    primaryWaiter: {
      id: mockWaiter2.id,
      name: mockWaiter2.name,
      email: mockWaiter2.email,
    },
    collaborators: [
      {
        id: 'c0000000-0000-0000-0000-000000000001',
        orderId: 'o0000000-0000-0000-0000-000000000002',
        userId: mockWaiter1.id,
        user: {
          id: mockWaiter1.id,
          name: mockWaiter1.name,
          email: mockWaiter1.email,
          role: 'waiter',
        },
        createdAt: '2026-08-31T12:05:00.000Z',
      },
    ],
    status: 'accepted',
    isArchived: false,
    totalPrice: 15.0,
    createdAt: '2026-08-31T12:00:00.000Z',
    updatedAt: '2026-08-31T12:00:00.000Z',
    lines: [],
  },
];

describe('Collaborators & Order Access Frontend UI (Phase 6)', () => {
  let mockOrders: Order[];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('restaurant_auth_token', 'mock-waiter1-token');
    vi.restoreAllMocks();
    mockOrders = JSON.parse(JSON.stringify(initialOrders));

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

        // Get me (logged in as Waiter 1)
        if (url.includes('/auth/me')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { user: mockWaiter1 },
              }),
          });
        }

        // Eligible Waiters GET
        if (url.includes('/orders/eligible-waiters')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { waiters: eligibleWaitersList },
              }),
          });
        }

        // Orders Collaborators POST
        if (url.includes('/collaborators') && options?.method === 'POST') {
          const body = JSON.parse(String(options.body));
          const targetWaiter = eligibleWaitersList.find((w) => w.id === body.userId);
          const order = mockOrders.find((o) => url.includes(o.id));
          const newCollab = {
            id: 'c-new-id',
            orderId: order?.id || '',
            userId: body.userId,
            user: targetWaiter,
            createdAt: new Date().toISOString(),
          };
          if (order) {
            order.collaborators = [...(order.collaborators || []), newCollab];
          }
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { collaborator: newCollab },
              }),
          });
        }

        // Orders Collaborators DELETE
        if (url.includes('/collaborators/') && options?.method === 'DELETE') {
          const parts = url.split('/');
          const userIdToRemove = parts[parts.length - 1];
          const order = mockOrders.find((o) => url.includes(o.id));
          if (order) {
            order.collaborators = (order.collaborators || []).filter(
              (c) => c.userId !== userIdToRemove
            );
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                message: 'Collaborator removed',
              }),
          });
        }

        // Orders GET single or list
        if (url.includes('/orders') && (!options || options.method === 'GET' || !options.method)) {
          const matchSingle = url.match(/\/orders\/([a-z0-9-]+)$/i);
          if (matchSingle && matchSingle[1] && !url.includes('?')) {
            const currentOrder = mockOrders.find((o) => o.id === matchSingle[1]) || mockOrders[0];
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () =>
                Promise.resolve({
                  status: 'success',
                  data: { order: JSON.parse(JSON.stringify(currentOrder)) },
                }),
            });
          }

          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { orders: JSON.parse(JSON.stringify(mockOrders)), count: mockOrders.length },
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
      expect(screen.getByText('Table 10')).toBeInTheDocument();
      expect(screen.getByText('Table 12')).toBeInTheDocument();
    });
  };

  it('1. Displays Primary Waiter badge on owned order and Collaborator badge on collaborated order', async () => {
    await renderOrderList();

    // Table 10 -> Current user (Waiter 1) is Primary Waiter
    expect(
      screen.getByTestId('badge-primary-waiter-o0000000-0000-0000-0000-000000000001')
    ).toHaveTextContent('Primary Waiter');

    // Table 12 -> Current user (Waiter 1) is Collaborator
    expect(
      screen.getByTestId('badge-collaborator-o0000000-0000-0000-0000-000000000002')
    ).toHaveTextContent('Collaborator');
  });

  it('2. Primary waiter can open Add Collaborator modal, select eligible waiter, and assign them', async () => {
    await renderOrderList();

    // Expand Table 10 card
    const table10Header = screen.getByText('Table 10');
    await act(async () => {
      fireEvent.click(table10Header);
    });

    // Check Add Collaborator button is present for Primary Waiter
    const addCollabBtn = await screen.findByTestId(
      'btn-open-add-collab-o0000000-0000-0000-0000-000000000001'
    );
    expect(addCollabBtn).toBeInTheDocument();

    // Open Add Collaborator Dialog
    await act(async () => {
      fireEvent.click(addCollabBtn);
    });

    // Verify modal appears with title
    expect(
      await screen.findByRole('heading', { name: /Add Collaborator to Table 10/i })
    ).toBeInTheDocument();

    // Select Waiter 2 (Taylor Jordan)
    const selectWaiter = screen.getByTestId('collab-select-waiter');
    fireEvent.change(selectWaiter, { target: { value: mockWaiter2.id } });

    // Submit assignment
    const confirmBtn = screen.getByTestId('confirm-add-collab-btn');
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // Verify collaborator tag appears in the Collaborators panel
    await waitFor(() => {
      expect(
        screen.getByTestId(`collaborator-tag-${mockWaiter2.id}`)
      ).toHaveTextContent('Taylor Jordan');
    });
  });

  it('3. Primary waiter can remove an assigned collaborator', async () => {
    // Start with Table 10 having Taylor Jordan assigned
    mockOrders[0].collaborators = [
      {
        id: 'c0000000-0000-0000-0000-000000000099',
        orderId: mockOrders[0].id,
        userId: mockWaiter2.id,
        user: mockWaiter2,
        createdAt: '2026-08-31T12:00:00.000Z',
      },
    ];

    await renderOrderList();

    // Expand Table 10
    const table10Header = screen.getByText('Table 10');
    await act(async () => {
      fireEvent.click(table10Header);
    });

    // Find and click Remove Collaborator button
    const removeBtn = await screen.findByTestId(`btn-remove-collab-${mockWaiter2.id}`);
    expect(removeBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(removeBtn);
    });

    // Verify collaborator is removed from the DOM
    await waitFor(() => {
      expect(screen.queryByTestId(`collaborator-tag-${mockWaiter2.id}`)).not.toBeInTheDocument();
      expect(screen.getByTestId(`no-collabs-${mockOrders[0].id}`)).toBeInTheDocument();
    });
  });

  it('4. Collaborator on an order does NOT see Add/Remove collaborator controls', async () => {
    await renderOrderList();

    // Expand Table 12 (where Waiter 1 is only a Collaborator, NOT Primary Waiter or Manager)
    const table12Header = screen.getByText('Table 12');
    await act(async () => {
      fireEvent.click(table12Header);
    });

    // Add Collaborator button must NOT be present
    await waitFor(() => {
      expect(
        screen.queryByTestId('btn-open-add-collab-o0000000-0000-0000-0000-000000000002')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(`btn-remove-collab-${mockWaiter1.id}`)
      ).not.toBeInTheDocument();
    });
  });
});
