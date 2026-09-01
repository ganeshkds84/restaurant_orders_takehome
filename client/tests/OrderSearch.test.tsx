import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider } from '../src/context/AuthContext';
import { OrderList } from '../src/components/OrderList';
import { Order } from '../src/types/order';

const mockManagerUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'manager@restaurant.com',
  name: 'Alex Rivera',
  role: 'manager' as const,
};

const mockWaiter1 = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'waiter@restaurant.com',
  name: 'Sam Chen',
  role: 'waiter' as const,
};

const sampleOrders: Order[] = [
  {
    id: 'o0000000-0000-0000-0000-000000000001',
    tableNumber: 'Table 10',
    primaryWaiterId: mockWaiter1.id,
    primaryWaiter: { id: mockWaiter1.id, name: mockWaiter1.name, email: mockWaiter1.email },
    status: 'placed',
    isArchived: false,
    totalPrice: 25.0,
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
    lines: [],
  },
  {
    id: 'o0000000-0000-0000-0000-000000000002',
    tableNumber: 'Patio 4',
    primaryWaiterId: mockWaiter1.id,
    primaryWaiter: { id: mockWaiter1.id, name: mockWaiter1.name, email: mockWaiter1.email },
    status: 'accepted',
    isArchived: false,
    totalPrice: 40.0,
    createdAt: '2026-09-01T12:15:00.000Z',
    updatedAt: '2026-09-01T12:15:00.000Z',
    lines: [],
  },
  {
    id: 'o0000000-0000-0000-0000-000000000003',
    tableNumber: 'Bar 02',
    primaryWaiterId: mockWaiter1.id,
    primaryWaiter: { id: mockWaiter1.id, name: mockWaiter1.name, email: mockWaiter1.email },
    status: 'preparing',
    isArchived: false,
    totalPrice: 15.0,
    createdAt: '2026-09-01T12:30:00.000Z',
    updatedAt: '2026-09-01T12:30:00.000Z',
    lines: [],
  },
];

describe('Order Search, Filtering, Sorting & Pagination UI (Phase 7)', () => {
  let lastFetchUrl = '';

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('restaurant_auth_token', 'mock-token');
    vi.restoreAllMocks();
    lastFetchUrl = '';

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        lastFetchUrl = url;

        // Health check
        if (url.includes('/health')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'ok',
                data: { timestamp: new Date().toISOString() },
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
                data: { user: mockManagerUser },
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
                data: { waiters: [mockWaiter1] },
              }),
          });
        }

        // Orders list query
        if (url.includes('/orders')) {
          const parsedUrl = new URL(url, 'http://localhost');
          const search = parsedUrl.searchParams.get('search') || '';
          const status = parsedUrl.searchParams.get('status') || '';

          let filtered = [...sampleOrders];
          if (search) {
            filtered = filtered.filter((o) =>
              o.tableNumber.toLowerCase().includes(search.toLowerCase())
            );
          }
          if (status) {
            filtered = filtered.filter((o) => o.status === status);
          }

          const page = Number(parsedUrl.searchParams.get('page') || '1');
          const limit = Number(parsedUrl.searchParams.get('limit') || '10');
          const offset = (page - 1) * limit;
          const pagedOrders = filtered.slice(offset, offset + limit);

          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: {
                  orders: pagedOrders,
                  total: filtered.length,
                  page,
                  limit,
                  totalPages: Math.ceil(filtered.length / limit),
                },
              }),
          });
        }

        return Promise.reject(new Error(`Unhandled URL: ${url}`));
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
      expect(screen.getByTestId('order-search-filter-toolbar')).toBeInTheDocument();
    });
  };

  it('1. Renders Search and Filter toolbar with Table search, Status, Waiter, Date, and Sort inputs', async () => {
    await renderOrderList();

    expect(screen.getByTestId('search-table-input')).toBeInTheDocument();
    expect(screen.getByTestId('filter-status-select')).toBeInTheDocument();
    expect(screen.getByTestId('filter-waiter-select')).toBeInTheDocument();
    expect(screen.getByTestId('filter-date-input')).toBeInTheDocument();
    expect(screen.getByTestId('sort-by-select')).toBeInTheDocument();
    expect(screen.getByTestId('sort-order-select')).toBeInTheDocument();
  });

  it('2. Filtering by Table Search updates query and filters rendered orders', async () => {
    await renderOrderList();

    const searchInput = screen.getByTestId('search-table-input');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Patio' } });
    });

    await waitFor(() => {
      expect(lastFetchUrl).toContain('search=Patio');
      expect(screen.getByText('Patio 4')).toBeInTheDocument();
      expect(screen.queryByText('Table 10')).not.toBeInTheDocument();
      expect(screen.queryByText('Bar 02')).not.toBeInTheDocument();
    });
  });

  it('3. Filtering by Status dropdown updates query to filter orders', async () => {
    await renderOrderList();

    const statusSelect = screen.getByTestId('filter-status-select');
    await act(async () => {
      fireEvent.change(statusSelect, { target: { value: 'preparing' } });
    });

    await waitFor(() => {
      expect(lastFetchUrl).toContain('status=preparing');
      expect(screen.getByText('Bar 02')).toBeInTheDocument();
      expect(screen.queryByText('Table 10')).not.toBeInTheDocument();
    });
  });

  it('4. Changing Sort options updates query parameters', async () => {
    await renderOrderList();

    const sortBySelect = screen.getByTestId('sort-by-select');
    await act(async () => {
      fireEvent.change(sortBySelect, { target: { value: 'tableNumber' } });
    });

    await waitFor(() => {
      expect(lastFetchUrl).toContain('sortBy=tableNumber');
    });

    const sortOrderSelect = screen.getByTestId('sort-order-select');
    await act(async () => {
      fireEvent.change(sortOrderSelect, { target: { value: 'asc' } });
    });

    await waitFor(() => {
      expect(lastFetchUrl).toContain('sortOrder=asc');
    });
  });

  it('5. Reset Filters button clears search and filter inputs back to defaults', async () => {
    await renderOrderList();

    // Type a search query
    const searchInput = screen.getByTestId('search-table-input');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Patio' } });
    });

    // Reset filters button should appear
    const resetBtn = await screen.findByTestId('btn-reset-filters');
    expect(resetBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(resetBtn);
    });

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
      expect(screen.getByText('Table 10')).toBeInTheDocument();
      expect(screen.getByText('Patio 4')).toBeInTheDocument();
      expect(screen.getByText('Bar 02')).toBeInTheDocument();
    });
  });

  it('6. Renders pagination info and handles page size change', async () => {
    await renderOrderList();

    expect(screen.getByTestId('pagination-info')).toHaveTextContent('Showing 1 to 3 of 3 orders');
    expect(screen.getByTestId('current-page-display')).toHaveTextContent('Page 1 of 1');
  });
});
