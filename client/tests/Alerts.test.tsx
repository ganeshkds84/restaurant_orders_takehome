import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertsView } from '../src/components/AlertsView';
import * as alertService from '../src/services/alert.service';
import { AuthProvider } from '../src/context/AuthContext';
import { SlowOrderAlert, SlowOrderAlertsResponse } from '../src/types/alert';

describe('Slow-Order Alerts UI (Phase 11 - Goal 10)', () => {
  const mockManager = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Alex Rivera (Manager)',
    email: 'manager@restaurant.com',
    role: 'manager' as const,
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('restaurant_auth_token', 'mock-token');
    vi.restoreAllMocks();

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
                data: { user: mockManager },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'success', data: {} }),
        });
      })
    );
  });

  const renderComponent = (props?: { onSelectOrder?: (orderId: string) => void; onAlertCountChange?: (count: number) => void }) => {
    return render(
      <AuthProvider>
        <AlertsView {...props} />
      </AuthProvider>
    );
  };

  it('1. Renders empty state when there are no slow-order alerts', async () => {
    const emptyResponse: SlowOrderAlertsResponse = {
      alerts: [],
      count: 0,
      thresholdMinutes: 15,
      reAlertMinutes: 15,
    };
    vi.spyOn(alertService, 'fetchSlowOrderAlerts').mockResolvedValue(emptyResponse);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('alerts-empty-state')).toBeInTheDocument();
      expect(screen.getByText(/All Orders Are On Track!/i)).toBeInTheDocument();
    });
  });

  it('2. Renders list of slow orders with table numbers, elapsed times, and overdue badges', async () => {
    const mockAlerts: SlowOrderAlert[] = [
      {
        orderId: 'order-1',
        tableNumber: 'Table 12',
        status: 'placed',
        primaryWaiterId: 'waiter-1',
        primaryWaiterName: 'Sam Chen',
        totalPrice: 48.5,
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        elapsedMinutes: 25.0,
        thresholdMinutes: 15,
        overdueMinutes: 10.0,
        isReAlert: false,
        lastAcknowledgedAt: null,
        lastAcknowledgedByName: null,
        collaborators: [{ id: 'waiter-2', name: 'Taylor Jordan' }],
      },
    ];

    vi.spyOn(alertService, 'fetchSlowOrderAlerts').mockResolvedValue({
      alerts: mockAlerts,
      count: 1,
      thresholdMinutes: 15,
      reAlertMinutes: 15,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('slow-orders-list')).toBeInTheDocument();
      expect(screen.getByText('Table 12')).toBeInTheDocument();
      expect(screen.getByTestId('status-badge-placed')).toBeInTheDocument();
      expect(screen.getByTestId('badge-overdue-order-1')).toHaveTextContent('10m OVERDUE');
      expect(screen.getByText('25 mins')).toBeInTheDocument();
      expect(screen.getByText('Sam Chen')).toBeInTheDocument();
      expect(screen.getByText('+1 collaborator')).toBeInTheDocument();
    });
  });

  it('3. Renders RE-ALERT badge for orders that returned after acknowledgement window', async () => {
    const mockAlerts: SlowOrderAlert[] = [
      {
        orderId: 'order-2',
        tableNumber: 'Table 4',
        status: 'preparing',
        primaryWaiterId: 'waiter-1',
        primaryWaiterName: 'Sam Chen',
        totalPrice: 65.0,
        createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        elapsedMinutes: 35.0,
        thresholdMinutes: 15,
        overdueMinutes: 20.0,
        isReAlert: true,
        lastAcknowledgedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        lastAcknowledgedByName: 'Sam Chen',
        collaborators: [],
      },
    ];

    vi.spyOn(alertService, 'fetchSlowOrderAlerts').mockResolvedValue({
      alerts: mockAlerts,
      count: 1,
      thresholdMinutes: 15,
      reAlertMinutes: 15,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('badge-re-alert-order-2')).toBeInTheDocument();
      expect(screen.getByText(/RE-ALERT \(STILL NOT READY\)/i)).toBeInTheDocument();
      expect(screen.getByTestId('status-badge-preparing')).toBeInTheDocument();
    });
  });

  it('4. Clicking Acknowledge Alert opens modal and clears alert from list upon confirmation', async () => {
    const mockAlerts: SlowOrderAlert[] = [
      {
        orderId: 'order-3',
        tableNumber: 'Table 8',
        status: 'accepted',
        primaryWaiterId: 'waiter-1',
        primaryWaiterName: 'Sam Chen',
        totalPrice: 32.0,
        createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        elapsedMinutes: 20.0,
        thresholdMinutes: 15,
        overdueMinutes: 5.0,
        isReAlert: false,
        lastAcknowledgedAt: null,
        lastAcknowledgedByName: null,
        collaborators: [],
      },
    ];

    vi.spyOn(alertService, 'fetchSlowOrderAlerts').mockResolvedValue({
      alerts: mockAlerts,
      count: 1,
      thresholdMinutes: 15,
      reAlertMinutes: 15,
    });

    const ackSpy = vi.spyOn(alertService, 'acknowledgeOrderAlert').mockResolvedValue({
      id: 'ack-1',
      orderId: 'order-3',
      userId: mockManager.id,
      acknowledgedAt: new Date().toISOString(),
      notes: 'Mains taking a few more minutes',
    });

    const onCountChange = vi.fn();
    renderComponent({ onAlertCountChange: onCountChange });

    await waitFor(() => {
      expect(screen.getByTestId('btn-acknowledge-alert-order-3')).toBeInTheDocument();
    });

    // Click acknowledge button on card
    fireEvent.click(screen.getByTestId('btn-acknowledge-alert-order-3'));

    // Modal opens
    expect(screen.getByTestId('ack-notes-input')).toBeInTheDocument();

    // Type notes and confirm
    fireEvent.change(screen.getByTestId('ack-notes-input'), {
      target: { value: 'Mains taking a few more minutes' },
    });
    fireEvent.click(screen.getByTestId('confirm-acknowledge-btn'));

    await waitFor(() => {
      expect(ackSpy).toHaveBeenCalledWith('mock-token', 'order-3', 'Mains taking a few more minutes');
      expect(screen.getByTestId('alert-action-success-banner')).toBeInTheDocument();
      expect(onCountChange).toHaveBeenCalledWith(0);
    });
  });

  it('5. Displays error banner when fetching alerts fails', async () => {
    vi.spyOn(alertService, 'fetchSlowOrderAlerts').mockRejectedValue(new Error('Network error loading alerts'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('alerts-error-banner')).toHaveTextContent('Network error loading alerts');
    });
  });
});
