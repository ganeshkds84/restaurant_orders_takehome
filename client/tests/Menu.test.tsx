import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../src/App';

const mockManagerUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'manager@restaurant.com',
  name: 'Alex Rivera (Manager)',
  role: 'manager',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

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
  {
    id: 'a0000000-0000-0000-0000-000000000006',
    name: 'Fresh Pasta Carbonara',
    description: 'House-made egg tagliatelle with guanciale',
    category: 'Mains',
    price: 18.5,
    isAvailable: false,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('Menu Item Management & Availability Frontend UI (Phase 3)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const setupMockFetch = (currentUser: typeof mockManagerUser | typeof mockWaiterUser) => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (url.includes('/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ status: 'success', data: { user: currentUser } }),
          });
        }
        if (url.includes('/health')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'healthy',
                database: { connected: true },
              }),
          });
        }
        if (url.includes('/menu') && (!options || options.method === 'GET' || !options.method)) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: {
                  items: mockMenuItems,
                  count: mockMenuItems.length,
                },
              }),
          });
        }
        if (url.includes('/menu') && options?.method === 'POST') {
          const body = JSON.parse(String(options.body));
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: {
                  item: {
                    id: 'new-mock-id-123',
                    ...body,
                    isArchived: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                },
              }),
          });
        }
        if (url.includes('/availability') && options?.method === 'PATCH') {
          const body = JSON.parse(String(options.body));
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: {
                  item: {
                    ...mockMenuItems[0],
                    isAvailable: body.isAvailable,
                  },
                },
              }),
          });
        }
        if (url.includes('/archive') && options?.method === 'PATCH') {
          const body = JSON.parse(String(options.body));
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'success',
                data: {
                  item: {
                    ...mockMenuItems[0],
                    isArchived: body.isArchived,
                  },
                },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success' }),
        });
      })
    );
  };

  it('1. Renders menu management dashboard for Manager with action controls', async () => {
    localStorage.setItem('restaurant_auth_token', 'manager-token');
    setupMockFetch(mockManagerUser);

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Menu Catalog & Availability')).toBeInTheDocument();
      expect(screen.getByText(/Add Menu Item/i)).toBeInTheDocument();
      expect(screen.getByText('Truffle Fries')).toBeInTheDocument();
      expect(screen.getByText('$9.50')).toBeInTheDocument();
      expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
      expect(screen.getByText('$16.50')).toBeInTheDocument();
    });

    // Check presence of manager-only action buttons
    expect(screen.getByTestId('toggle-availability-a0000000-0000-0000-0000-000000000001')).toBeInTheDocument();
    expect(screen.getByTestId('edit-item-a0000000-0000-0000-0000-000000000001')).toBeInTheDocument();
    expect(screen.getByTestId('archive-item-a0000000-0000-0000-0000-000000000001')).toBeInTheDocument();
  });

  it('2. Renders read-only menu catalog for Waiter without mutation buttons', async () => {
    localStorage.setItem('restaurant_auth_token', 'waiter-token');
    setupMockFetch(mockWaiterUser);

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Menu Catalog & Availability')).toBeInTheDocument();
      expect(screen.getByText('Truffle Fries')).toBeInTheDocument();
    });

    // Verify Waiter cannot see "Add Menu Item" button
    expect(screen.queryByText(/Add Menu Item/i)).toBeNull();
    expect(screen.getByText(/Catalog Edit: Manager Only/i)).toBeInTheDocument();

    // Verify Waiter sees read-only availability status rather than toggle buttons
    expect(screen.queryByTestId('toggle-availability-a0000000-0000-0000-0000-000000000001')).toBeNull();
    expect(screen.queryByTestId('edit-item-a0000000-0000-0000-0000-000000000001')).toBeNull();
    expect(screen.getAllByText(/Waiter: View Only/i).length).toBeGreaterThan(0);
  });

  it('3. Manager can toggle availability of an item (86ing a dish)', async () => {
    localStorage.setItem('restaurant_auth_token', 'manager-token');
    setupMockFetch(mockManagerUser);

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Truffle Fries')).toBeInTheDocument();
    });

    const toggleBtn = screen.getByTestId('toggle-availability-a0000000-0000-0000-0000-000000000001');
    expect(toggleBtn).toHaveTextContent("Mark 86'd");

    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/marked as unavailable/i)).toBeInTheDocument();
    });
  });

  it('4. Manager can open create modal and submit a new menu item', async () => {
    localStorage.setItem('restaurant_auth_token', 'manager-token');
    setupMockFetch(mockManagerUser);

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Menu Catalog & Availability')).toBeInTheDocument();
    });

    const addBtn = screen.getByText(/Add Menu Item/i);
    fireEvent.click(addBtn);

    expect(screen.getByText('Add New Menu Item')).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Dish Name \*/i);
    const priceInput = screen.getByLabelText(/Price \(\$\) \*/i);
    const descInput = screen.getByLabelText(/Description & Ingredients/i);

    fireEvent.change(nameInput, { target: { value: 'Crispy Calamari' } });
    fireEvent.change(priceInput, { target: { value: '14.50' } });
    fireEvent.change(descInput, { target: { value: 'Served with spicy marinara and lemon' } });

    const saveBtn = screen.getByRole('button', { name: /Create Menu Item/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/"Crispy Calamari" created successfully/i)).toBeInTheDocument();
      expect(screen.getByText('Crispy Calamari')).toBeInTheDocument();
    });
  });

  it('5. Category tabs filter displayed dishes', async () => {
    localStorage.setItem('restaurant_auth_token', 'manager-token');
    setupMockFetch(mockManagerUser);

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Truffle Fries')).toBeInTheDocument();
      expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
    });

    // Click "Appetizers" category pill
    const appPill = screen.getByRole('button', { name: 'Appetizers' });
    fireEvent.click(appPill);

    expect(screen.getByText('Truffle Fries')).toBeInTheDocument();
    expect(screen.queryByText('Margherita Pizza')).toBeNull();
  });

  it('6. Search box filters dishes by name dynamically', async () => {
    localStorage.setItem('restaurant_auth_token', 'manager-token');
    setupMockFetch(mockManagerUser);

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Truffle Fries')).toBeInTheDocument();
      expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search dishes or ingredients/i);
    fireEvent.change(searchInput, { target: { value: 'Pizza' } });

    expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
    expect(screen.queryByText('Truffle Fries')).toBeNull();
  });
});
