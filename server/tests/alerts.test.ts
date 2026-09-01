import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { orderRepository } from '../src/orders/order.repository.js';
import { menuRepository } from '../src/menu/menu.repository.js';
import { userRepository } from '../src/users/user.repository.js';
import { signToken } from '../src/auth/jwt.js';
import { UserResponse } from '../src/types/auth.js';
import { MenuItem } from '../src/types/menu.js';
import { SlowOrderAlertsResponse } from '../src/types/alert.js';

describe('Slow-Order Alerts API (Phase 11 - Goal 10)', () => {
  const app = createApp();

  const mockManager: UserResponse = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Alex Rivera (Manager)',
    email: 'manager@restaurant.com',
    role: 'manager',
  };

  const mockWaiter1: UserResponse = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Sam Chen (Waiter)',
    email: 'waiter@restaurant.com',
    role: 'waiter',
  };

  const mockWaiter2: UserResponse = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Taylor Jordan (Waiter 2)',
    email: 'waiter2@restaurant.com',
    role: 'waiter',
  };

  const mockWaiter3: UserResponse = {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Morgan Blake (Waiter 3)',
    email: 'waiter3@restaurant.com',
    role: 'waiter',
  };

  let managerToken: string;
  let waiter1Token: string;
  let waiter2Token: string;
  let waiter3Token: string;
  let steakItem: MenuItem;

  beforeEach(async () => {
    orderRepository.resetMemoryStore();
    menuRepository.resetMemoryStore();
    userRepository.resetMemoryStore();

    managerToken = signToken({
      userId: mockManager.id,
      name: mockManager.name,
      email: mockManager.email,
      role: mockManager.role,
    });

    waiter1Token = signToken({
      userId: mockWaiter1.id,
      name: mockWaiter1.name,
      email: mockWaiter1.email,
      role: mockWaiter1.role,
    });

    waiter2Token = signToken({
      userId: mockWaiter2.id,
      name: mockWaiter2.name,
      email: mockWaiter2.email,
      role: mockWaiter2.role,
    });

    waiter3Token = signToken({
      userId: mockWaiter3.id,
      name: mockWaiter3.name,
      email: mockWaiter3.email,
      role: mockWaiter3.role,
    });

    steakItem = await menuRepository.create({
      name: 'Prime Ribeye Steak',
      description: 'Garlic herb butter',
      category: 'Mains',
      price: 35.0,
      isAvailable: true,
    });
  });

  describe('1. Threshold Calculations and Status Eligibility', () => {
    it('1. Order under threshold (<= 15 mins) does not trigger slow-order alert', async () => {
      // Create fresh order placed just now (0 minutes old)
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 5',
          items: [{ menuItemId: steakItem.id, quantity: 1 }],
        });
      expect(orderRes.status).toBe(201);

      const alertsRes = await request(app)
        .get('/api/orders/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(alertsRes.status).toBe(200);
      const data = alertsRes.body.data as SlowOrderAlertsResponse;
      expect(data.count).toBe(0);
      expect(data.alerts).toHaveLength(0);
    });

    it('2. Order exceeding threshold (> 15 mins) in placed status triggers alert', async () => {
      const order = await orderRepository.createOrderWithLines(
        {
          tableNumber: 'Table 10',
          primaryWaiterId: mockWaiter1.id,
          totalPrice: 35.0,
        },
        [
          {
            menuItemId: steakItem.id,
            itemName: steakItem.name,
            quantity: 1,
            unitPrice: steakItem.price,
            specialInstructions: '',
          },
        ]
      );

      // Backdate order.created_at to 20 minutes ago
      const memoryOrder = orderRepository.getAllOrdersForMemory().find((o) => o.id === order.id);
      if (memoryOrder) {
        memoryOrder.created_at = new Date(Date.now() - 20 * 60 * 1000);
      }

      const alertsRes = await request(app)
        .get('/api/orders/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(alertsRes.status).toBe(200);
      const data = alertsRes.body.data as SlowOrderAlertsResponse;
      expect(data.count).toBe(1);
      expect(data.alerts[0].orderId).toBe(order.id);
      expect(data.alerts[0].tableNumber).toBe('Table 10');
      expect(data.alerts[0].status).toBe('placed');
      expect(data.alerts[0].elapsedMinutes).toBeGreaterThanOrEqual(19.9);
      expect(data.alerts[0].overdueMinutes).toBeGreaterThanOrEqual(4.9);
      expect(data.alerts[0].isReAlert).toBe(false);
    });

    it('3. Order exceeding threshold in accepted and preparing statuses triggers alert', async () => {
      // Order 1 in accepted status (18 mins old)
      const orderAccepted = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 1', primaryWaiterId: mockWaiter1.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      await orderRepository.updateOrderStatus(orderAccepted.id, 'placed', 'accepted');
      const mem1 = orderRepository.getAllOrdersForMemory().find((o) => o.id === orderAccepted.id);
      if (mem1) mem1.created_at = new Date(Date.now() - 18 * 60 * 1000);

      // Order 2 in preparing status (25 mins old)
      const orderPrep = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 2', primaryWaiterId: mockWaiter1.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      await orderRepository.updateOrderStatus(orderPrep.id, 'placed', 'accepted');
      await orderRepository.updateOrderStatus(orderPrep.id, 'accepted', 'preparing');
      const mem2 = orderRepository.getAllOrdersForMemory().find((o) => o.id === orderPrep.id);
      if (mem2) mem2.created_at = new Date(Date.now() - 25 * 60 * 1000);

      const alertsRes = await request(app)
        .get('/api/orders/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(alertsRes.status).toBe(200);
      const data = alertsRes.body.data as SlowOrderAlertsResponse;
      expect(data.count).toBe(2);
      expect(data.alerts.map((a) => a.tableNumber)).toEqual(['Table 2', 'Table 1']); // Longest waiting first
    });

    it('4. Order reaching Ready status is excluded from alerts even if elapsed > 15 mins', async () => {
      const orderReady = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 3', primaryWaiterId: mockWaiter1.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      await orderRepository.updateOrderStatus(orderReady.id, 'placed', 'accepted');
      await orderRepository.updateOrderStatus(orderReady.id, 'accepted', 'preparing');
      await orderRepository.updateOrderStatus(orderReady.id, 'preparing', 'ready');
      const mem = orderRepository.getAllOrdersForMemory().find((o) => o.id === orderReady.id);
      if (mem) mem.created_at = new Date(Date.now() - 30 * 60 * 1000);

      const alertsRes = await request(app)
        .get('/api/orders/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(alertsRes.status).toBe(200);
      expect(alertsRes.body.data.count).toBe(0);
    });

    it('5. Served, Cancelled, and Archived orders are excluded from alerts', async () => {
      // Served order (40 mins old)
      const orderServed = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 4', primaryWaiterId: mockWaiter1.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      await orderRepository.updateOrderStatus(orderServed.id, 'placed', 'accepted');
      await orderRepository.updateOrderStatus(orderServed.id, 'accepted', 'preparing');
      await orderRepository.updateOrderStatus(orderServed.id, 'preparing', 'ready');
      await orderRepository.updateOrderStatus(orderServed.id, 'ready', 'served');
      const memServed = orderRepository.getAllOrdersForMemory().find((o) => o.id === orderServed.id);
      if (memServed) memServed.created_at = new Date(Date.now() - 40 * 60 * 1000);

      // Cancelled order (30 mins old)
      const orderCancelled = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 5', primaryWaiterId: mockWaiter1.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      await orderRepository.updateOrderStatus(orderCancelled.id, 'placed', 'cancelled', undefined, 'Customer left');
      const memCancelled = orderRepository.getAllOrdersForMemory().find((o) => o.id === orderCancelled.id);
      if (memCancelled) memCancelled.created_at = new Date(Date.now() - 30 * 60 * 1000);

      // Archived order (25 mins old)
      const orderArchived = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 6', primaryWaiterId: mockWaiter1.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      const memArchived = orderRepository.getAllOrdersForMemory().find((o) => o.id === orderArchived.id);
      if (memArchived) {
        memArchived.is_archived = true;
        memArchived.created_at = new Date(Date.now() - 25 * 60 * 1000);
      }

      const alertsRes = await request(app)
        .get('/api/orders/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(alertsRes.status).toBe(200);
      expect(alertsRes.body.data.count).toBe(0);
    });
  });

  describe('2. Alert Acknowledgement & Re-Alert Lifecycle', () => {
    it('6. Acknowledging a slow-order alert clears it from the list', async () => {
      const order = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 8', primaryWaiterId: mockWaiter1.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      const mem = orderRepository.getAllOrdersForMemory().find((o) => o.id === order.id);
      if (mem) mem.created_at = new Date(Date.now() - 22 * 60 * 1000);

      // Verify it appears in alerts
      let alertsRes = await request(app)
        .get('/api/orders/alerts')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(alertsRes.body.data.count).toBe(1);

      // Acknowledge the alert
      const ackRes = await request(app)
        .post(`/api/orders/${order.id}/alerts/acknowledge`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ notes: 'Checked with kitchen, mains on grill' });

      expect(ackRes.status).toBe(200);
      expect(ackRes.body.status).toBe('success');
      expect(ackRes.body.data.acknowledgement.orderId).toBe(order.id);

      // Verify it is now cleared from alerts
      alertsRes = await request(app)
        .get('/api/orders/alerts')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(alertsRes.body.data.count).toBe(0);
    });

    it('7. If order remains open > 15 mins after acknowledgement, alert returns as a re-alert', async () => {
      const order = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 9', primaryWaiterId: mockWaiter1.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      const mem = orderRepository.getAllOrdersForMemory().find((o) => o.id === order.id);
      if (mem) mem.created_at = new Date(Date.now() - 40 * 60 * 1000);

      // Acknowledge alert
      await request(app)
        .post(`/api/orders/${order.id}/alerts/acknowledge`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ notes: 'First check' });

      // Backdate the acknowledgement to 18 minutes ago (exceeding reAlertMinutes)
      const ackList = orderRepository.getAllAlertAcknowledgementsForMemory();
      if (ackList.length > 0) {
        ackList[0].acknowledged_at = new Date(Date.now() - 18 * 60 * 1000);
      }

      // Query alerts again
      const alertsRes = await request(app)
        .get('/api/orders/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(alertsRes.status).toBe(200);
      const data = alertsRes.body.data as SlowOrderAlertsResponse;
      expect(data.count).toBe(1);
      expect(data.alerts[0].orderId).toBe(order.id);
      expect(data.alerts[0].isReAlert).toBe(true);
      expect(data.alerts[0].lastAcknowledgedAt).not.toBeNull();
    });
  });

  describe('3. Role-Based Scoping and Authorization', () => {
    it('8. Manager sees alerts across all tables and waitstaff', async () => {
      // Order by Waiter 1 (20 mins old)
      const order1 = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 1', primaryWaiterId: mockWaiter1.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      const mem1 = orderRepository.getAllOrdersForMemory().find((o) => o.id === order1.id);
      if (mem1) mem1.created_at = new Date(Date.now() - 20 * 60 * 1000);

      // Order by Waiter 2 (22 mins old)
      const order2 = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 2', primaryWaiterId: mockWaiter2.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      const mem2 = orderRepository.getAllOrdersForMemory().find((o) => o.id === order2.id);
      if (mem2) mem2.created_at = new Date(Date.now() - 22 * 60 * 1000);

      const managerAlerts = await request(app)
        .get('/api/orders/alerts')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(managerAlerts.status).toBe(200);
      expect(managerAlerts.body.data.count).toBe(2);
    });

    it('9. Waiter only sees alerts for orders they own or collaborate on', async () => {
      // Order 1: Waiter 1 is primary (20 mins old)
      const order1 = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 1', primaryWaiterId: mockWaiter1.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      const mem1 = orderRepository.getAllOrdersForMemory().find((o) => o.id === order1.id);
      if (mem1) mem1.created_at = new Date(Date.now() - 20 * 60 * 1000);

      // Order 2: Waiter 2 is primary, Waiter 1 is collaborator (25 mins old)
      const order2 = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 2', primaryWaiterId: mockWaiter2.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      await orderRepository.addCollaborator(order2.id, mockWaiter1.id);
      const mem2 = orderRepository.getAllOrdersForMemory().find((o) => o.id === order2.id);
      if (mem2) mem2.created_at = new Date(Date.now() - 25 * 60 * 1000);

      // Order 3: Waiter 3 is primary, Waiter 1 is NOT assigned (30 mins old)
      const order3 = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 3', primaryWaiterId: mockWaiter3.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      const mem3 = orderRepository.getAllOrdersForMemory().find((o) => o.id === order3.id);
      if (mem3) mem3.created_at = new Date(Date.now() - 30 * 60 * 1000);

      // Waiter 1 queries alerts -> should see Order 1 and Order 2, NOT Order 3
      const waiter1Alerts = await request(app)
        .get('/api/orders/alerts')
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(waiter1Alerts.status).toBe(200);
      expect(waiter1Alerts.body.data.count).toBe(2);
      const orderIds = waiter1Alerts.body.data.alerts.map((a: any) => a.orderId);
      expect(orderIds).toContain(order1.id);
      expect(orderIds).toContain(order2.id);
      expect(orderIds).not.toContain(order3.id);
    });

    it('10. Unassigned waiter is forbidden from acknowledging alerts for inaccessible orders (403 Forbidden)', async () => {
      const order = await orderRepository.createOrderWithLines(
        { tableNumber: 'Table 7', primaryWaiterId: mockWaiter1.id, totalPrice: 35.0 },
        [{ menuItemId: steakItem.id, itemName: steakItem.name, quantity: 1, unitPrice: 35.0, specialInstructions: '' }]
      );
      const mem = orderRepository.getAllOrdersForMemory().find((o) => o.id === order.id);
      if (mem) mem.created_at = new Date(Date.now() - 20 * 60 * 1000);

      // Waiter 3 (unassigned) tries to acknowledge Waiter 1's order
      const res = await request(app)
        .post(`/api/orders/${order.id}/alerts/acknowledge`)
        .set('Authorization', `Bearer ${waiter3Token}`)
        .send({ notes: 'Unauthorized attempt' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('11. Unauthenticated requests to alerts endpoint receive 401 Unauthorized', async () => {
      const res = await request(app).get('/api/orders/alerts');
      expect(res.status).toBe(401);
    });
  });
});
