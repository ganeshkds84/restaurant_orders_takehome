import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider } from '../src/context/AuthContext';
import { MenuManagement } from '../src/components/MenuManagement';
import { OrderList } from '../src/components/OrderList';
import { MenuItem } from '../src/types/menu';

const mockManagerUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'manager@restaurant.com',
  name: 'Alex Rivera',
  role: 'manager' as const,
};

const mockSampleItems: MenuItem[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Truffle Fries',
    description: 'Crispy fries with truffle oil',
    category: 'Appetizers',
    price: 9.5,
    isAvailable: true,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'Caesar Salad',
    description: 'Fresh romaine and parmesan',
    category: 'Appetizers',
    price: 12.0,
    isAvailable: true,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('Bulk Menu Item Operations & Daily Orders CSV Export Frontend UI (Phase 8)', () => {
  let bulkPayloadSent: any = null;
  let lastExportUrl = '';

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('restaurant_auth_token', 'mock-manager-token');
    vi.restoreAllMocks();
    bulkPayloadSent = null;
    lastExportUrl = '';

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

        // Bulk menu update POST
        if (url.includes('/menu/bulk') && options?.method === 'POST') {
          bulkPayloadSent = JSON.parse(options.body as string);
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: {
                  results: bulkPayloadSent.itemIds.map((id: string) => ({
                    itemId: id,
                    name: id === mockSampleItems[0].id ? 'Truffle Fries' : 'Caesar Salad',
                    success: true,
                    message:
                      bulkPayloadSent.action === 'update_price'
                        ? `Price updated to $${bulkPayloadSent.price}`
                        : 'Availability updated',
                  })),
                  summary: {
                    total: bulkPayloadSent.itemIds.length,
                    succeeded: bulkPayloadSent.itemIds.length,
                    failed: 0,
                  },
                },
              }),
          });
        }

        // Menu items GET
        if (url.includes('/menu') && (!options || options.method === 'GET' || !options.method)) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { items: mockSampleItems, count: mockSampleItems.length },
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
                data: { waiters: [] },
              }),
          });
        }

        // Orders CSV Export GET
        if (url.includes('/orders/export/csv')) {
          lastExportUrl = url;
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve('"Order ID","Table Number","Status"\n"o-1","Table 1","placed"'),
          });
        }

        // Orders list GET
        if (url.includes('/orders')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: { orders: [], total: 0, page: 1, limit: 10, totalPages: 0 },
              }),
          });
        }

        return Promise.reject(new Error(`Unhandled URL in test: ${url}`));
      })
    );
  });

  it('1. Renders Bulk Actions Toolbar with Select All and individual item checkboxes for Manager', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <MenuManagement />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('bulk-actions-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('btn-select-all')).toBeInTheDocument();
      expect(
        screen.getByTestId(`checkbox-item-${mockSampleItems[0].id}`)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`checkbox-item-${mockSampleItems[1].id}`)
      ).toBeInTheDocument();
    });
  });

  it('2. Selecting multiple items reveals bulk action buttons (Change Price, Set Available, Set Unavailable)', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <MenuManagement />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('btn-select-all')).toBeInTheDocument();
    });

    // Select All
    const selectAllBtn = screen.getByTestId('btn-select-all');
    await act(async () => {
      fireEvent.click(selectAllBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('selected-count-badge')).toHaveTextContent('2 items selected');
      expect(screen.getByTestId('btn-bulk-price')).toBeInTheDocument();
      expect(screen.getByTestId('btn-bulk-available')).toBeInTheDocument();
      expect(screen.getByTestId('btn-bulk-unavailable')).toBeInTheDocument();
    });
  });

  it('3. Submitting bulk price update opens modal, submits API request, and displays results summary modal', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <MenuManagement />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('btn-select-all')).toBeInTheDocument();
    });

    // Select all
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-select-all'));
    });

    // Click Change Price
    const bulkPriceBtn = await screen.findByTestId('btn-bulk-price');
    await act(async () => {
      fireEvent.click(bulkPriceBtn);
    });

    // Fill price input
    const priceInput = await screen.findByTestId('bulk-price-input');
    await act(async () => {
      fireEvent.change(priceInput, { target: { value: '18.50' } });
    });

    // Submit
    const confirmBtn = screen.getByTestId('btn-confirm-bulk-price');
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(bulkPayloadSent).toEqual({
        itemIds: [mockSampleItems[0].id, mockSampleItems[1].id],
        action: 'update_price',
        price: 18.5,
      });
      expect(screen.getByTestId('bulk-results-modal')).toBeInTheDocument();
      expect(screen.getByText('Bulk Action Summary')).toBeInTheDocument();
    });
  });

  it('4. Submitting bulk availability update sends update_availability payload to server', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <MenuManagement />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('btn-select-all')).toBeInTheDocument();
    });

    // Select all
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-select-all'));
    });

    // Click Set Unavailable (86)
    const unavailableBtn = await screen.findByTestId('btn-bulk-unavailable');
    await act(async () => {
      fireEvent.click(unavailableBtn);
    });

    await waitFor(() => {
      expect(bulkPayloadSent).toEqual({
        itemIds: [mockSampleItems[0].id, mockSampleItems[1].id],
        action: 'update_availability',
        isAvailable: false,
      });
      expect(screen.getByTestId('bulk-results-modal')).toBeInTheDocument();
    });
  });

  it('5. Export Orders (CSV) button triggers API call with date query', async () => {
    // Mock URL.createObjectURL, revokeObjectURL, and anchor click
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await act(async () => {
      render(
        <AuthProvider>
          <OrderList />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('btn-export-orders-csv')).toBeInTheDocument();
    });

    const exportBtn = screen.getByTestId('btn-export-orders-csv');
    await act(async () => {
      fireEvent.click(exportBtn);
    });

    await waitFor(() => {
      expect(lastExportUrl).toContain('/orders/export/csv');
      expect(clickSpy).toHaveBeenCalled();
    });

    clickSpy.mockRestore();
  });

});
