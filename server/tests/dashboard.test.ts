import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { signToken } from '../src/auth/jwt.js';
import { menuRepository } from '../src/menu/menu.repository.js';
import { orderRepository } from '../src/orders/order.repository.js';
import { userRepository } from '../src/users/user.repository.js';
import { UserRole } from '../src/types/auth.js';

const app = createApp();

const managerUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'manager@restaurant.com',
  name: 'Alex Rivera (Manager)',
  role: 'manager' as UserRole,
};

const waiter1User = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'waiter@restaurant.com',
  name: 'Sam Chen (Waiter)',
  role: 'waiter' as UserRole,
};

const waiter2User = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'waiter2@restaurant.com',
  name: 'Taylor Jordan (Waiter 2)',
  role: 'waiter' as UserRole,
};

const managerToken = signToken({
  userId: managerUser.id,
  email: managerUser.email,
  role: managerUser.role,
});

const waiter1Token = signToken({
  userId: waiter1User.id,
  email: waiter1User.email,
  role: waiter1User.role,
});

describe('Dashboard Analytics & Landing View API (Phase 9 - Goal 8)', () => {
  let item1Id: string;
  let item2Id: string;

  beforeEach(async () => {
    menuRepository.resetMemoryStore();
    orderRepository.resetMemoryStore();
    userRepository.resetMemoryStore();

    item1Id = 'a0000000-0000-0000-0000-000000000001'; // Truffle Fries ($9.50)
    item2Id = 'a0000000-0000-0000-0000-000000000002'; // Caesar Salad ($12.00)
  });

  describe('1. Authentication and Access Control', () => {
    it('1. Rejects unauthenticated dashboard requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/dashboard/stats');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });

    it('2. Manager can access dashboard statistics', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('headline');
      expect(res.body.data).toHaveProperty('statusBreakdown');
      expect(res.body.data).toHaveProperty('waiterBreakdown');
      expect(res.body.data).toHaveProperty('dailyServedChart');
    });

    it('3. Waiter can access dashboard statistics', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('headline');
    });
  });

  describe('2. Headline Numbers Calculation', () => {
    it('4. Computes open orders, placed today, served today, and revenue today accurately', async () => {
      // Create Order 1: Table 10, placed status ($9.50)
      const order1Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 10',
          items: [{ menuItemId: item1Id, quantity: 1 }],
        });
      expect(order1Res.status).toBe(201);
      const order1Id = order1Res.body.data.order.id;

      // Create Order 2: Table 12 ($24.00) -> transition to served
      const order2Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 12',
          items: [{ menuItemId: item2Id, quantity: 2 }],
        });
      const order2Id = order2Res.body.data.order.id;

      // Advance Order 2 to served: placed -> accepted -> preparing -> ready -> served
      await request(app)
        .patch(`/api/orders/${order2Id}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });
      await request(app)
        .patch(`/api/orders/${order2Id}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'preparing' });
      await request(app)
        .patch(`/api/orders/${order2Id}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'ready' });
      await request(app)
        .patch(`/api/orders/${order2Id}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'served' });

      // Create Order 3: Table 14 ($9.50) -> Cancelled
      const order3Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 14',
          items: [{ menuItemId: item1Id, quantity: 1 }],
        });
      const order3Id = order3Res.body.data.order.id;
      await request(app)
        .post(`/api/orders/${order3Id}/cancel`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ reason: 'Customer changed mind' });

      // Fetch dashboard metrics
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const headline = res.body.data.headline;

      // Open orders: Order 1 (placed). Order 2 (served - closed), Order 3 (cancelled - closed)
      expect(headline.openOrders).toBe(1);
      // Orders placed today: Order 1, 2, 3 = 3
      expect(headline.ordersPlacedToday).toBe(3);
      // Orders served today: Order 2 = 1
      expect(headline.ordersServedToday).toBe(1);
      // Revenue today: Order 2 = $24.00
      expect(headline.revenueToday).toBe(24);
    });

    it('5. Excludes archived orders from open orders count', async () => {
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 1',
          items: [{ menuItemId: item1Id, quantity: 1 }],
        });
      const orderId = orderRes.body.data.order.id;

      // Mark the order as archived
      const orders = orderRepository.getAllOrdersForMemory();
      if (orders.length > 0) {
        orders[0].is_archived = true;
      }

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.body.data.headline.openOrders).toBe(0);
    });
  });

  describe('3. Breakdown by Order Status', () => {
    it('6. Breaks orders down by all lifecycle statuses', async () => {
      // Create 1 placed order
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 20',
          items: [{ menuItemId: item1Id, quantity: 1 }],
        });

      // Create 1 accepted order
      const resAccepted = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 21',
          items: [{ menuItemId: item1Id, quantity: 1 }],
        });
      await request(app)
        .patch(`/api/orders/${resAccepted.body.data.order.id}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const statusBreakdown = res.body.data.statusBreakdown;
      expect(Array.isArray(statusBreakdown)).toBe(true);

      const placedItem = statusBreakdown.find((s: any) => s.status === 'placed');
      const acceptedItem = statusBreakdown.find((s: any) => s.status === 'accepted');
      const readyItem = statusBreakdown.find((s: any) => s.status === 'ready');

      expect(placedItem?.count).toBe(1);
      expect(acceptedItem?.count).toBe(1);
      expect(readyItem?.count).toBe(0);
    });
  });

  describe('4. Breakdown by Waiter', () => {
    it('7. Breaks orders down by primary waiter with counts and revenue', async () => {
      // Waiter 1 creates 2 orders
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 30',
          items: [{ menuItemId: item1Id, quantity: 2 }], // $19.00
        });

      // Waiter 2 creates 1 order
      const waiter2Token = signToken({
        userId: waiter2User.id,
        email: waiter2User.email,
        role: waiter2User.role,
      });

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter2Token}`)
        .send({
          tableNumber: 'Table 31',
          items: [{ menuItemId: item2Id, quantity: 1 }], // $12.00
        });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const waiterBreakdown = res.body.data.waiterBreakdown;
      expect(Array.isArray(waiterBreakdown)).toBe(true);

      const sam = waiterBreakdown.find((w: any) => w.waiterId === waiter1User.id);
      const taylor = waiterBreakdown.find((w: any) => w.waiterId === waiter2User.id);

      expect(sam).toBeDefined();
      expect(sam?.orderCount).toBe(1);
      expect(sam?.totalRevenue).toBe(19);

      expect(taylor).toBeDefined();
      expect(taylor?.orderCount).toBe(1);
      expect(taylor?.totalRevenue).toBe(12);
    });
  });

  describe('5. 14-Day Served Orders Chart Series', () => {
    it('8. Returns exactly 14 chronological daily buckets zero-filled where no served orders exist', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const chart = res.body.data.dailyServedChart;
      expect(Array.isArray(chart)).toBe(true);
      expect(chart.length).toBe(14);

      // Verify date ordering (chronologically ascending)
      for (let i = 0; i < chart.length - 1; i++) {
        expect(new Date(chart[i].date).getTime()).toBeLessThan(
          new Date(chart[i + 1].date).getTime()
        );
        expect(chart[i]).toHaveProperty('count');
      }
    });

    it('9. Increments the daily served count for orders served on that day', async () => {
      // Create and serve an order
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 50',
          items: [{ menuItemId: item1Id, quantity: 1 }],
        });
      const orderId = orderRes.body.data.order.id;

      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'preparing' });
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'ready' });
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'served' });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const chart = res.body.data.dailyServedChart;
      const todayBucket = chart[chart.length - 1]; // last day is today
      expect(todayBucket.count).toBeGreaterThanOrEqual(1);
    });

    it('10. Validates date query parameter format and rejects invalid dates with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats?date=invalid-date')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });
});
