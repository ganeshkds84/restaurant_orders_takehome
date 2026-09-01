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
  name: 'Alex Rivera',
  role: 'manager' as UserRole,
};

const waiterUser = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'waiter@restaurant.com',
  name: 'Sam Chen',
  role: 'waiter' as UserRole,
};

const managerToken = signToken({
  userId: managerUser.id,
  email: managerUser.email,
  role: managerUser.role,
});

const waiterToken = signToken({
  userId: waiterUser.id,
  email: waiterUser.email,
  role: waiterUser.role,
});

describe('Bulk Menu Item Operations & Daily Orders CSV Export API (Phase 8)', () => {
  let item1Id: string;
  let item2Id: string;
  let item3Id: string;

  beforeEach(async () => {
    menuRepository.resetMemoryStore();
    orderRepository.resetMemoryStore();
    userRepository.resetMemoryStore();

    // Default pre-seeded item IDs from repository
    item1Id = 'a0000000-0000-0000-0000-000000000001'; // Truffle Fries ($9.50)
    item2Id = 'a0000000-0000-0000-0000-000000000002'; // Caesar Salad ($12.00)
    item3Id = 'a0000000-0000-0000-0000-000000000003'; // Margherita Pizza ($16.50)
  });

  describe('1. Bulk Menu Item Price Updates', () => {
    it('1. Manager can update prices for multiple menu items in a single action', async () => {
      const res = await request(app)
        .post('/api/menu/bulk')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          itemIds: [item1Id, item2Id],
          action: 'update_price',
          price: 14.5,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.summary).toEqual({
        total: 2,
        succeeded: 2,
        failed: 0,
      });

      // Verify in repository
      const updated1 = await menuRepository.findById(item1Id);
      const updated2 = await menuRepository.findById(item2Id);
      expect(Number(updated1?.price)).toBe(14.5);
      expect(Number(updated2?.price)).toBe(14.5);
    });

    it('2. Manager can bulk update availability (86ing multiple items)', async () => {
      const res = await request(app)
        .post('/api/menu/bulk')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          itemIds: [item1Id, item2Id, item3Id],
          action: 'update_availability',
          isAvailable: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.summary).toEqual({
        total: 3,
        succeeded: 3,
        failed: 0,
      });

      const updated1 = await menuRepository.findById(item1Id);
      const updated2 = await menuRepository.findById(item2Id);
      const updated3 = await menuRepository.findById(item3Id);
      expect(updated1?.is_available).toBe(false);
      expect(updated2?.is_available).toBe(false);
      expect(updated3?.is_available).toBe(false);
    });
  });

  describe('2. Partial Batch Failures & Granular Error Reporting', () => {
    it('3. Reports per-item errors when some items in selection are invalid without failing valid items', async () => {
      const nonExistentId = '99999999-9999-9999-9999-999999999999';

      const res = await request(app)
        .post('/api/menu/bulk')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          itemIds: [item1Id, nonExistentId, item2Id],
          action: 'update_price',
          price: 20.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.summary).toEqual({
        total: 3,
        succeeded: 2,
        failed: 1,
      });

      const results = res.body.data.results;
      expect(results).toHaveLength(3);

      // Item 1 succeeded
      expect(results[0].itemId).toBe(item1Id);
      expect(results[0].success).toBe(true);

      // Non-existent item failed with descriptive error
      expect(results[1].itemId).toBe(nonExistentId);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toMatch(/not found/i);

      // Item 2 succeeded
      expect(results[2].itemId).toBe(item2Id);
      expect(results[2].success).toBe(true);

      // Verify valid items were persisted
      const updated1 = await menuRepository.findById(item1Id);
      const updated2 = await menuRepository.findById(item2Id);
      expect(Number(updated1?.price)).toBe(20.0);
      expect(Number(updated2?.price)).toBe(20.0);
    });

    it('4. Rejects negative price per item with clear reason without crashing', async () => {
      const res = await request(app)
        .post('/api/menu/bulk')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          itemIds: [item1Id, item2Id],
          action: 'update_price',
          price: -10.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.summary).toEqual({
        total: 2,
        succeeded: 0,
        failed: 2,
      });
      expect(res.body.data.results[0].error).toMatch(/non-negative/i);
    });
  });

  describe('3. Role-Based Access Control', () => {
    it('5. Waiter cannot execute bulk menu operations (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/menu/bulk')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          itemIds: [item1Id],
          action: 'update_price',
          price: 15.0,
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });

    it('6. Unauthenticated request to bulk menu operations is rejected (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/menu/bulk')
        .send({
          itemIds: [item1Id],
          action: 'update_price',
          price: 15.0,
        });

      expect(res.status).toBe(401);
    });
  });

  describe('4. Daily Orders CSV Export', () => {
    it('7. Exports orders placed on a specific day with lines, totals, and statuses as CSV', async () => {
      // Create test order
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableNumber: 'Table 42',
          items: [
            { menuItemId: item1Id, quantity: 2, specialInstructions: 'Extra crispy' },
            { menuItemId: item2Id, quantity: 1 },
          ],
        });
      expect(orderRes.status).toBe(201);

      const todayStr = new Date().toISOString().slice(0, 10);

      const csvRes = await request(app)
        .get(`/api/orders/export/csv?date=${todayStr}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(csvRes.status).toBe(200);
      expect(csvRes.headers['content-type']).toContain('text/csv');
      expect(csvRes.headers['content-disposition']).toContain(`attachment; filename="orders-${todayStr}.csv"`);

      const csvText = csvRes.text;
      expect(csvText).toContain('"Order ID","Table Number","Status","Placed At"');
      expect(csvText).toContain('"Table 42"');
      expect(csvText).toContain('"placed"');
      expect(csvText).toContain('"Truffle Fries"');
      expect(csvText).toContain('"2"');
      expect(csvText).toContain('"Extra crispy"');
      expect(csvText).toContain('"Caesar Salad"');
    });

    it('8. Exports CSV for a date with no orders returning header row safely', async () => {
      const csvRes = await request(app)
        .get('/api/orders/export/csv?date=2020-01-01')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(csvRes.status).toBe(200);
      expect(csvRes.headers['content-type']).toContain('text/csv');
      const lines = csvRes.text.trim().split(/\r?\n/);
      expect(lines).toHaveLength(1); // Only header row
    });

    it('9. Preserves voided line status and reason in CSV export', async () => {
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          tableNumber: 'Table 99',
          items: [{ menuItemId: item1Id, quantity: 1 }],
        });

      const orderId = orderRes.body.data.order.id;
      const lineId = orderRes.body.data.order.lines[0].id;

      // Void the line
      await request(app)
        .patch(`/api/orders/${orderId}/lines/${lineId}/void`)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({ reason: 'Customer changed mind' });

      const todayStr = new Date().toISOString().slice(0, 10);
      const csvRes = await request(app)
        .get(`/api/orders/export/csv?date=${todayStr}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(csvRes.status).toBe(200);
      expect(csvRes.text).toContain('"Yes"');
      expect(csvRes.text).toContain('"Customer changed mind"');
    });
  });
});
