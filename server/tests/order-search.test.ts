import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { signToken } from '../src/auth/jwt.js';
import { orderRepository } from '../src/orders/order.repository.js';
import { menuRepository } from '../src/menu/menu.repository.js';
import { userRepository } from '../src/users/user.repository.js';
import { UserRole } from '../src/types/auth.js';

const app = createApp();

// Pre-seeded test users
const managerUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'manager@restaurant.com',
  name: 'Alex Rivera',
  role: 'manager' as UserRole,
};

const waiterUser1 = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'waiter@restaurant.com',
  name: 'Sam Chen',
  role: 'waiter' as UserRole,
};

const waiterUser2 = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'waiter2@restaurant.com',
  name: 'Taylor Jordan',
  role: 'waiter' as UserRole,
};

const waiterUser3 = {
  id: '44444444-4444-4444-4444-444444444444',
  email: 'waiter3@restaurant.com',
  name: 'Morgan Blake',
  role: 'waiter' as UserRole,
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

describe('Order Search, Filtering, Sorting & Pagination API (Phase 7)', () => {
  const item1Id = 'a0000000-0000-0000-0000-000000000001'; // Truffle Fries ($9.50)
  const item2Id = 'a0000000-0000-0000-0000-000000000002'; // Caesar Salad ($12.00)

  beforeEach(async () => {
    orderRepository.resetMemoryStore();
    menuRepository.resetMemoryStore();
    userRepository.resetMemoryStore();
  });


  // Helper to create test orders
  async function createOrder(
    token: string,
    tableNumber: string,
    items = [{ menuItemId: item1Id, quantity: 1 }]
  ) {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ tableNumber, items });
    return res.body.data.order;
  }

  describe('1. Text Search over Table Number', () => {
    it('1. Searches orders by exact table number match', async () => {
      await createOrder(waiter1Token, 'Table 10');
      await createOrder(waiter1Token, 'Table 20');
      await createOrder(waiter1Token, 'Bar 05');

      const res = await request(app)
        .get('/api/orders?search=Table 10')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.orders).toHaveLength(1);
      expect(res.body.data.orders[0].tableNumber).toBe('Table 10');
    });

    it('2. Searches orders with case-insensitive substring match', async () => {
      await createOrder(waiter1Token, 'Patio-01');
      await createOrder(waiter1Token, 'PATIO-02');
      await createOrder(waiter1Token, 'Inside Table 4');

      const res = await request(app)
        .get('/api/orders?search=patio')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.orders).toHaveLength(2);
      const tables = res.body.data.orders.map((o: any) => o.tableNumber);
      expect(tables).toContain('Patio-01');
      expect(tables).toContain('PATIO-02');
    });

    it('3. Returns empty array with total=0 when no table matches search query', async () => {
      await createOrder(waiter1Token, 'Table 1');

      const res = await request(app)
        .get('/api/orders?search=NonExistentTable')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.orders).toEqual([]);
      expect(res.body.data.totalPages).toBe(0);
    });
  });

  describe('2. Filtering by Status, Waiter, and Date', () => {
    it('4. Filters orders strictly by status', async () => {
      const order1 = await createOrder(waiter1Token, 'Table 1');
      const order2 = await createOrder(waiter1Token, 'Table 2');
      const order3 = await createOrder(waiter1Token, 'Table 3');

      // Transition order 2 to accepted, order 3 to accepted -> preparing
      await request(app)
        .patch(`/api/orders/${order2.id}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });

      await request(app)
        .patch(`/api/orders/${order3.id}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });
      await request(app)
        .patch(`/api/orders/${order3.id}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'preparing' });

      // Query status=accepted
      const res = await request(app)
        .get('/api/orders?status=accepted')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.orders[0].id).toBe(order2.id);
      expect(res.body.data.orders[0].status).toBe('accepted');
    });

    it('5. Filters orders by waiter ID (matching primary waiter or collaborator)', async () => {
      const order1 = await createOrder(waiter1Token, 'Table 100'); // Primary: Waiter 1
      const order2 = await createOrder(waiter2Token, 'Table 200'); // Primary: Waiter 2
      const order3 = await createOrder(waiter3Token, 'Table 300'); // Primary: Waiter 3, Collab: Waiter 1

      // Add Waiter 1 as collaborator to order 3
      await request(app)
        .post(`/api/orders/${order3.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter3Token}`)
        .send({ userId: waiterUser1.id });

      // Manager filters by Waiter 1
      const res = await request(app)
        .get(`/api/orders?waiterId=${waiterUser1.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(2);
      const ids = res.body.data.orders.map((o: any) => o.id);
      expect(ids).toContain(order1.id);
      expect(ids).toContain(order3.id);
      expect(ids).not.toContain(order2.id);
    });

    it('6. Filters orders by calendar date (YYYY-MM-DD)', async () => {
      await createOrder(waiter1Token, 'Table 50');

      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .get(`/api/orders?date=${todayStr}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.orders[0].tableNumber).toBe('Table 50');

      // Non-matching date
      const resEmpty = await request(app)
        .get('/api/orders?date=2020-01-01')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(resEmpty.status).toBe(200);
      expect(resEmpty.body.data.total).toBe(0);
      expect(resEmpty.body.data.orders).toEqual([]);
    });
  });

  describe('3. Sorting Orders', () => {
    it('7. Sorts orders by table number ascending and descending', async () => {
      await createOrder(waiter1Token, 'Table C');
      await createOrder(waiter1Token, 'Table A');
      await createOrder(waiter1Token, 'Table B');

      const resAsc = await request(app)
        .get('/api/orders?sortBy=tableNumber&sortOrder=asc')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(resAsc.status).toBe(200);
      const tablesAsc = resAsc.body.data.orders.map((o: any) => o.tableNumber);
      expect(tablesAsc).toEqual(['Table A', 'Table B', 'Table C']);

      const resDesc = await request(app)
        .get('/api/orders?sortBy=tableNumber&sortOrder=desc')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(resDesc.status).toBe(200);
      const tablesDesc = resDesc.body.data.orders.map((o: any) => o.tableNumber);
      expect(tablesDesc).toEqual(['Table C', 'Table B', 'Table A']);
    });

    it('8. Sorts orders by status', async () => {
      const o1 = await createOrder(waiter1Token, 'Table 1');
      const o2 = await createOrder(waiter1Token, 'Table 2');

      // Make o2 accepted
      await request(app)
        .patch(`/api/orders/${o2.id}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });

      const res = await request(app)
        .get('/api/orders?sortBy=status&sortOrder=asc')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orders[0].status).toBe('accepted');
      expect(res.body.data.orders[1].status).toBe('placed');
    });

    it('9. Defaults to sorting by placed time descending (newest first)', async () => {
      const o1 = await createOrder(waiter1Token, 'Table 1');
      const o2 = await createOrder(waiter1Token, 'Table 2');
      const o3 = await createOrder(waiter1Token, 'Table 3');

      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orders[0].id).toBe(o3.id);
      expect(res.body.data.orders[2].id).toBe(o1.id);
    });
  });

  describe('4. Server-Side Pagination & Response Metadata', () => {
    it('10. Paginates results correctly across pages with total and totalPages metadata', async () => {
      // Create 5 orders
      for (let i = 1; i <= 5; i++) {
        await createOrder(waiter1Token, `Table ${i}`);
      }

      // Page 1 with limit 2
      const resPage1 = await request(app)
        .get('/api/orders?page=1&limit=2&sortBy=tableNumber&sortOrder=asc')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(resPage1.status).toBe(200);
      expect(resPage1.body.data.total).toBe(5);
      expect(resPage1.body.data.page).toBe(1);
      expect(resPage1.body.data.limit).toBe(2);
      expect(resPage1.body.data.totalPages).toBe(3);
      expect(resPage1.body.data.orders).toHaveLength(2);
      expect(resPage1.body.data.orders[0].tableNumber).toBe('Table 1');
      expect(resPage1.body.data.orders[1].tableNumber).toBe('Table 2');

      // Page 2 with limit 2
      const resPage2 = await request(app)
        .get('/api/orders?page=2&limit=2&sortBy=tableNumber&sortOrder=asc')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(resPage2.status).toBe(200);
      expect(resPage2.body.data.page).toBe(2);
      expect(resPage2.body.data.orders).toHaveLength(2);
      expect(resPage2.body.data.orders[0].tableNumber).toBe('Table 3');
      expect(resPage2.body.data.orders[1].tableNumber).toBe('Table 4');

      // Page 3 with limit 2
      const resPage3 = await request(app)
        .get('/api/orders?page=3&limit=2&sortBy=tableNumber&sortOrder=asc')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(resPage3.status).toBe(200);
      expect(resPage3.body.data.page).toBe(3);
      expect(resPage3.body.data.orders).toHaveLength(1);
      expect(resPage3.body.data.orders[0].tableNumber).toBe('Table 5');
    });

    it('11. Requesting page beyond totalPages returns empty list with correct total', async () => {
      await createOrder(waiter1Token, 'Table 1');

      const res = await request(app)
        .get('/api/orders?page=99&limit=10')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.page).toBe(99);
      expect(res.body.data.orders).toEqual([]);
    });
  });

  describe('5. Access Scoping & Anti-Tampering Security', () => {
    it('12. Waiter query is strictly scoped to orders they created or collaborate on', async () => {
      const w1Order = await createOrder(waiter1Token, 'Table W1');
      const w2Order = await createOrder(waiter2Token, 'Table W2');
      const w3Order = await createOrder(waiter3Token, 'Table W3');

      // Add Waiter 1 as collaborator to W3's order
      await request(app)
        .post(`/api/orders/${w3Order.id}/collaborators`)
        .set('Authorization', `Bearer ${waiter3Token}`)
        .send({ userId: waiterUser1.id });

      // Waiter 1 queries orders
      const resW1 = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(resW1.status).toBe(200);
      expect(resW1.body.data.total).toBe(2);
      const w1OrderIds = resW1.body.data.orders.map((o: any) => o.id);
      expect(w1OrderIds).toContain(w1Order.id);
      expect(w1OrderIds).toContain(w3Order.id);
      expect(w1OrderIds).not.toContain(w2Order.id);
    });

    it('13. Waiter cannot search or discover another waiter’s order by table search or waiterId filter', async () => {
      await createOrder(waiter2Token, 'Secret VIP Table 77');

      // Waiter 1 tries to search for Waiter 2's order
      const resSearch = await request(app)
        .get('/api/orders?search=VIP')
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(resSearch.status).toBe(200);
      expect(resSearch.body.data.total).toBe(0);
      expect(resSearch.body.data.orders).toEqual([]);

      // Waiter 1 tries to filter by waiterId of Waiter 2
      const resFilter = await request(app)
        .get(`/api/orders?waiterId=${waiterUser2.id}`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(resFilter.status).toBe(200);
      expect(resFilter.body.data.total).toBe(0);
      expect(resFilter.body.data.orders).toEqual([]);
    });

    it('14. Manager can search and filter across all restaurant orders without restriction', async () => {
      await createOrder(waiter1Token, 'Table 1');
      await createOrder(waiter2Token, 'Table 2');
      await createOrder(waiter3Token, 'Table 3');

      const resManager = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(resManager.status).toBe(200);
      expect(resManager.body.data.total).toBe(3);
    });
  });

  describe('6. Validation & Error Handling', () => {
    it('15. Rejects invalid date format with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/orders?date=01-09-2026')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toMatch(/invalid query parameters/i);
    });

    it('16. Rejects invalid order status with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/orders?status=cooking')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('17. Rejects invalid UUID in waiterId with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/orders?waiterId=not-a-uuid')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });
});
