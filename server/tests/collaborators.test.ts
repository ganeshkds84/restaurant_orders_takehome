import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { orderRepository } from '../src/orders/order.repository.js';
import { menuRepository } from '../src/menu/menu.repository.js';
import { userRepository } from '../src/users/user.repository.js';
import { signToken } from '../src/auth/jwt.js';

const app = createApp();

const managerUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'manager@restaurant.com',
  name: 'Alex Rivera (Manager)',
  role: 'manager' as const,
};

const waiterUser1 = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'waiter@restaurant.com',
  name: 'Sam Chen (Waiter 1)',
  role: 'waiter' as const,
};

const waiterUser2 = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'waiter2@restaurant.com',
  name: 'Taylor Jordan (Waiter 2)',
  role: 'waiter' as const,
};

const waiterUser3 = {
  id: '44444444-4444-4444-4444-444444444444',
  email: 'waiter3@restaurant.com',
  name: 'Morgan Blake (Waiter 3)',
  role: 'waiter' as const,
};

const managerToken = signToken({
  userId: managerUser.id,
  email: managerUser.email,
  role: managerUser.role,
});

const waiter1Token = signToken({
  userId: waiterUser1.id,
  email: waiterUser1.email,
  role: waiterUser1.role,
});

const waiter2Token = signToken({
  userId: waiterUser2.id,
  email: waiterUser2.email,
  role: waiterUser2.role,
});

const waiter3Token = signToken({
  userId: waiterUser3.id,
  email: waiterUser3.email,
  role: waiterUser3.role,
});

// Helper to create an order as waiter 1
async function createTestOrder(tableNumber = 'Table 10') {
  const payload = {
    tableNumber,
    items: [
      {
        menuItemId: 'a0000000-0000-0000-0000-000000000001',
        quantity: 2,
        specialInstructions: 'Crispy',
      },
    ],
  };
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${waiter1Token}`)
    .send(payload);
  return res.body.data.order;
}

describe('Collaborators & Order Access API (Phase 6)', () => {
  beforeEach(async () => {
    orderRepository.resetMemoryStore();
    menuRepository.resetMemoryStore();
    userRepository.resetMemoryStore();
  });


  describe('1. Database / Relationship & Adding Collaborators', () => {
    it('1. Primary waiter can add a valid waiter as a collaborator', async () => {
      const order = await createTestOrder('Table 21');

      const res = await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.collaborator).toMatchObject({
        orderId: order.id,
        userId: waiterUser2.id,
      });
    });

    it('2. Duplicate collaborator assignment is rejected (400 Bad Request)', async () => {
      const order = await createTestOrder('Table 22');

      // First assignment succeeds
      const firstRes = await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });
      expect(firstRes.status).toBe(201);

      // Duplicate assignment rejected
      const dupRes = await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });
      expect(dupRes.status).toBe(400);
      expect(dupRes.body.message).toMatch(/already assigned as a collaborator/i);
    });

    it('3. Adding a non-existent user is rejected with 404', async () => {
      const order = await createTestOrder('Table 23');

      const res = await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: '99999999-9999-9999-9999-999999999999' });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('4. Primary waiter cannot be added as a collaborator to their own order', async () => {
      const order = await createTestOrder('Table 24');

      const res = await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser1.id });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already the primary waiter/i);
    });

    it('5. Manager cannot be added as a collaborator (only waiters can collaborate)', async () => {
      const order = await createTestOrder('Table 25');

      const res = await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: managerUser.id });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/only waiters can be assigned/i);
    });
  });

  describe('2. Removing Collaborators', () => {
    it('6. Primary waiter can remove an assigned collaborator', async () => {
      const order = await createTestOrder('Table 26');

      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      const removeRes = await request(app)
        .delete(`/api/orders/${order.id}/collaborators/${waiterUser2.id}`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(removeRes.status).toBe(200);
      expect(removeRes.body.message).toMatch(/removed from order successfully/i);

      // Verify collaborator list is empty
      const listRes = await request(app)
        .get(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`);
      expect(listRes.body.data.collaborators).toHaveLength(0);
    });

    it('7. Manager can remove any collaborator on any order', async () => {
      const order = await createTestOrder('Table 27');

      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      const removeRes = await request(app)
        .delete(`/api/orders/${order.id}/collaborators/${waiterUser2.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(removeRes.status).toBe(200);
    });

    it('8. Removing non-assigned user returns 404', async () => {
      const order = await createTestOrder('Table 28');

      const removeRes = await request(app)
        .delete(`/api/orders/${order.id}/collaborators/${waiterUser2.id}`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(removeRes.status).toBe(404);
    });

    it('9. Attempting to remove primary waiter as a collaborator is rejected (400 Bad Request)', async () => {
      const order = await createTestOrder('Table 29');

      const removeRes = await request(app)
        .delete(`/api/orders/${order.id}/collaborators/${waiterUser1.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(removeRes.status).toBe(400);
      expect(removeRes.body.message).toMatch(/primary waiter is not a collaborator/i);
    });

    it('10. Removing one collaborator does not affect other collaborators', async () => {
      const order = await createTestOrder('Table 30');

      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser3.id });

      // Remove waiter 2
      await request(app)
        .delete(`/api/orders/${order.id}/collaborators/${waiterUser2.id}`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      // Check remaining collaborators
      const listRes = await request(app)
        .get(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(listRes.body.data.collaborators).toHaveLength(1);
      expect(listRes.body.data.collaborators[0].userId).toBe(waiterUser3.id);
    });
  });

  describe('3. Authorization & Management Permissions', () => {
    it('11. Unauthenticated requests to collaborator endpoints are rejected (401)', async () => {
      const order = await createTestOrder('Table 31');

      const res = await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .send({ userId: waiterUser2.id });

      expect(res.status).toBe(401);
    });

    it('12. Unassigned waiter cannot add a collaborator (403 Forbidden)', async () => {
      const order = await createTestOrder('Table 32');

      const res = await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter2Token}`)
        .send({ userId: waiterUser3.id });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('13. Assigned collaborator cannot add other collaborators (403 Forbidden - only primary waiter/manager)', async () => {
      const order = await createTestOrder('Table 33');

      // Waiter 1 adds Waiter 2 as collaborator
      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      // Waiter 2 attempts to add Waiter 3
      const res = await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter2Token}`)
        .send({ userId: waiterUser3.id });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/only the primary waiter or a manager can add collaborators/i);
    });

    it('14. Assigned collaborator cannot remove other collaborators (403 Forbidden)', async () => {
      const order = await createTestOrder('Table 34');

      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser3.id });

      const res = await request(app)
        .delete(`/api/orders/${order.id}/collaborators/${waiterUser3.id}`)
        .set('Authorization', `Bearer ${waiter2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('15. Manager can add collaborator to any order', async () => {
      const order = await createTestOrder('Table 35');

      const res = await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ userId: waiterUser2.id });

      expect(res.status).toBe(201);
    });
  });

  describe('4. Order Access Control & Order List Scoping', () => {
    it('16. Unassigned waiter cannot view order (403 Forbidden)', async () => {
      const order = await createTestOrder('Table 36');

      const res = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${waiter2Token}`);

      expect(res.status).toBe(403);
    });

    it('17. Assigned collaborator can view single order detail (200 OK)', async () => {
      const order = await createTestOrder('Table 37');

      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      const res = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${waiter2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.order.id).toBe(order.id);
      expect(res.body.data.order.collaborators).toHaveLength(1);
      expect(res.body.data.order.collaborators[0].userId).toBe(waiterUser2.id);
    });

    it('18. GET /api/orders lists both primary and collaborated orders for a waiter', async () => {
      // Order 1: Waiter 1 is primary
      const order1 = await createTestOrder('Table 101');
      // Order 2: Waiter 2 is primary
      const payload2 = {
        tableNumber: 'Table 102',
        items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
      };
      const resOrder2 = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter2Token}`)
        .send(payload2);
      const order2 = resOrder2.body.data.order;

      // Add Waiter 2 as collaborator to Order 1
      await request(app)
        .post(`/api/orders/${order1.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      // Waiter 2 queries orders list -> should see Order 1 (as collaborator) and Order 2 (as primary)
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${waiter2Token}`);

      expect(res.status).toBe(200);
      const orderIds = res.body.data.orders.map((o: { id: string }) => o.id);
      expect(orderIds).toContain(order1.id);
      expect(orderIds).toContain(order2.id);

      // Waiter 3 (unassigned) queries orders list -> should see 0 orders
      const res3 = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${waiter3Token}`);
      expect(res3.body.data.orders).toHaveLength(0);
    });

    it('19. Manager sees all orders restaurant-wide in GET /api/orders', async () => {
      await createTestOrder('Table 201');

      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
    });

    it('20. Removing collaborator immediately revokes access (403 Forbidden)', async () => {
      const order = await createTestOrder('Table 38');

      // Add collaborator
      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      // Waiter 2 can view
      const viewRes1 = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${waiter2Token}`);
      expect(viewRes1.status).toBe(200);

      // Remove collaborator
      await request(app)
        .delete(`/api/orders/${order.id}/collaborators/${waiterUser2.id}`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      // Waiter 2 is immediately forbidden
      const viewRes2 = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${waiter2Token}`);
      expect(viewRes2.status).toBe(403);
    });
  });

  describe('5. Collaborator Permissions Granularity', () => {
    it('21. Collaborator can transition order lifecycle status', async () => {
      const order = await createTestOrder('Table 40');

      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      // Waiter 2 transitions to accepted
      const res = await request(app)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${waiter2Token}`)
        .send({ status: 'accepted' });

      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe('accepted');
    });

    it('22. Collaborator can add order lines before served', async () => {
      const order = await createTestOrder('Table 41');

      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      const res = await request(app)
        .post(`/api/orders/${order.id}/lines`)
        .set('Authorization', `Bearer ${waiter2Token}`)
        .send({
          menuItemId: 'a0000000-0000-0000-0000-000000000002', // Caesar Salad $12.00
          quantity: 1,
          specialInstructions: 'No croutons',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order.lines).toHaveLength(2);
      expect(res.body.data.order.totalPrice).toBe(31.0); // 19.00 + 12.00
    });

    it('23. Collaborator can void order lines with a reason while order is open', async () => {
      const order = await createTestOrder('Table 42');
      const lineId = order.lines[0].id;

      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      const res = await request(app)
        .patch(`/api/orders/${order.id}/lines/${lineId}/void`)
        .set('Authorization', `Bearer ${waiter2Token}`)
        .send({ reason: 'Guest changed mind' });

      expect(res.status).toBe(200);
      expect(res.body.data.order.lines[0].isVoided).toBe(true);
      expect(res.body.data.order.lines[0].voidReason).toBe('Guest changed mind');
      expect(res.body.data.order.totalPrice).toBe(0.0);
    });

    it('24. Collaborator can cancel order while placed or accepted', async () => {
      const order = await createTestOrder('Table 43');

      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      const res = await request(app)
        .post(`/api/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${waiter2Token}`)
        .send({ reason: 'Table had an emergency' });

      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe('cancelled');
    });

    it('25. Collaborator cannot violate state machine rules (e.g. cancel when preparing)', async () => {
      const order = await createTestOrder('Table 44');

      await request(app)
        .post(`/api/orders/${order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: waiterUser2.id });

      // Move to preparing
      await request(app)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });
      await request(app)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'preparing' });

      // Collaborator attempts to cancel while preparing -> rejected
      const cancelRes = await request(app)
        .post(`/api/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${waiter2Token}`)
        .send({ reason: 'Customer wants to cancel' });

      expect(cancelRes.status).toBe(400);
      expect(cancelRes.body.message).toMatch(/cannot cancel order/i);
    });
  });

  describe('6. Eligible Waiters & Anti-Tampering Security', () => {
    it('26. GET /api/orders/eligible-waiters returns list of waiters without sensitive info', async () => {
      const res = await request(app)
        .get('/api/orders/eligible-waiters')
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.waiters.length).toBeGreaterThanOrEqual(2);
      for (const w of res.body.data.waiters) {
        expect(w.role).toBe('waiter');
        expect(w).toHaveProperty('id');
        expect(w).toHaveProperty('name');
        expect(w).toHaveProperty('email');
        expect(w).not.toHaveProperty('password_hash');
        expect(w).not.toHaveProperty('passwordHash');
      }
    });

    it('27. Client cannot bypass authorization by spoofing role or primary waiter in payload', async () => {
      const order = await createTestOrder('Table 45');

      // Unassigned waiter tries to modify with fake role or primary_waiter_id in body
      const res = await request(app)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${waiter2Token}`)
        .send({
          status: 'accepted',
          role: 'manager',
          primaryWaiterId: waiterUser2.id,
        });

      expect(res.status).toBe(403);
    });
  });
});
