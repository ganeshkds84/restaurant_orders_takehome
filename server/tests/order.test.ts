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
  name: 'Rajesh Sharma (Manager)',
  role: 'manager' as const,
};

const waiterUser1 = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'waiter1@restaurant.com',
  name: 'Arjun Kumar (Waiter 1)',
  role: 'waiter' as const,
};

const waiterUser2 = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'waiter2@restaurant.com',
  name: 'Ananya Rao (Waiter 2)',
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

describe('Order Creation & Order Lines API (Phase 4)', () => {
  beforeEach(() => {
    orderRepository.resetMemoryStore();
    menuRepository.resetMemoryStore();
    userRepository.resetMemoryStore();
  });

  describe('1. Order Creation & Validation', () => {
    it('1. Authenticated waiter can create a valid order with line items', async () => {
      // Veg Samosa (id: a0000000-0000-0000-0000-000000000001, price: 90.00)
      // Paneer Tikka (id: a0000000-0000-0000-0000-000000000002, price: 220.00)
      const payload = {
        tableNumber: 'Table 14',
        items: [
          {
            menuItemId: 'a0000000-0000-0000-0000-000000000001',
            quantity: 2,
            specialInstructions: 'Extra crispy',
          },
          {
            menuItemId: 'a0000000-0000-0000-0000-000000000002',
            quantity: 1,
            specialInstructions: 'Mint chutney on side',
          },
        ],
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.order).toMatchObject({
        tableNumber: 'Table 14',
        primaryWaiterId: waiterUser1.id,
        status: 'placed',
        isArchived: false,
        totalPrice: 400.0, // 2*90.00 + 1*220.00 = 180 + 220 = 400.00
      });
      expect(res.body.data.order.lines).toHaveLength(2);
      expect(res.body.data.order.lines[0]).toMatchObject({
        menuItemId: 'a0000000-0000-0000-0000-000000000001',
        itemName: 'Veg Samosa',
        quantity: 2,
        unitPrice: 90.0,
        lineTotal: 180.0,
        specialInstructions: 'Extra crispy',
      });
    });

    it('2. Unauthenticated user cannot create an order (returns 401)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          tableNumber: 'Table 5',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });

      expect(res.status).toBe(401);
    });

    it('3. Invalid order payload (missing table number) is rejected with 400', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: '',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('4. Empty order items array is rejected with 400', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 12',
          items: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('5. Invalid quantities (0, negative, non-integer) are rejected with 400', async () => {
      const resZero = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 12',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 0 }],
        });
      expect(resZero.status).toBe(400);

      const resNeg = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 12',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: -3 }],
        });
      expect(resNeg.status).toBe(400);

      const resFloat = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 12',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1.5 }],
        });
      expect(resFloat.status).toBe(400);
    });

    it('6. Nonexistent menu item is rejected with 400', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 12',
          items: [
            {
              menuItemId: '00000000-0000-0000-0000-000000000099',
              quantity: 1,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Menu item not found');
    });

    it('7. Unavailable (86ed) menu item is rejected with 400', async () => {
      // Fresh Pasta Carbonara (id: a0000000-0000-0000-0000-000000000006) has is_available: false
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 8',
          items: [
            {
              menuItemId: 'a0000000-0000-0000-0000-000000000006',
              quantity: 1,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('unavailable');
    });
  });

  describe('2. Security & Anti-Tampering', () => {
    it('8. Server strictly determines the order owner from authentication identity', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 3',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order.primaryWaiterId).toBe(waiterUser1.id);
    });

    it('9. Client CANNOT supply another user ID to create an order on their behalf', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 3',
          primaryWaiterId: waiterUser2.id, // Attempt to spoof waiter 2
          primary_waiter_id: waiterUser2.id,
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });

      expect(res.status).toBe(201);
      // Must still be assigned to authenticated waiter 1
      expect(res.body.data.order.primaryWaiterId).toBe(waiterUser1.id);
    });

    it('10. Client CANNOT supply/override menu prices (server reads from DB)', async () => {
      // Veg Samosa is 90.00 in database; client tries to supply 1.00
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 3',
          items: [
            {
              menuItemId: 'a0000000-0000-0000-0000-000000000001',
              quantity: 2,
              unitPrice: 1.0,
              price: 1.0,
            } as any,
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order.lines[0].unitPrice).toBe(90.0);
      expect(res.body.data.order.totalPrice).toBe(180.0);
    });

    it('11. Client CANNOT supply/override the order total', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 3',
          totalPrice: 0.01,
          total_price: 0.01,
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order.totalPrice).toBe(90.0);
    });

    it('12. Client CANNOT supply/override initial status (always starts as placed)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 3',
          status: 'ready',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order.status).toBe('placed');
    });
  });

  describe('3. Order Lines & Historical Price Snapshot', () => {
    it('13-16. Persists line quantity, menu reference, snapshot unit price, and multiple lines', async () => {
      const payload = {
        tableNumber: 'Bar-4',
        items: [
          {
            menuItemId: 'a0000000-0000-0000-0000-000000000003', // Chicken 65: 240.00
            quantity: 2,
          },
          {
            menuItemId: 'a0000000-0000-0000-0000-000000000008', // Veg Biryani: 240.00
            quantity: 3,
            specialInstructions: 'Extra spicy',
          },
        ],
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send(payload);

      expect(res.status).toBe(201);
      const order = res.body.data.order;
      expect(order.lines).toHaveLength(2);

      const chickenLine = order.lines.find((l: any) => l.menuItemId === 'a0000000-0000-0000-0000-000000000003');
      expect(chickenLine).toBeDefined();
      expect(chickenLine.quantity).toBe(2);
      expect(chickenLine.unitPrice).toBe(240.0);
      expect(chickenLine.lineTotal).toBe(480.0);

      const biryaniLine = order.lines.find((l: any) => l.menuItemId === 'a0000000-0000-0000-0000-000000000008');
      expect(biryaniLine).toBeDefined();
      expect(biryaniLine.quantity).toBe(3);
      expect(biryaniLine.unitPrice).toBe(240.0);
      expect(biryaniLine.lineTotal).toBe(720.0);
      expect(biryaniLine.specialInstructions).toBe('Extra spicy');

      expect(order.totalPrice).toBe(1200.0); // 480.0 + 720.0
    });

    it('17-20. CRITICAL REGRESSION TEST: Changing menu item price later DOES NOT affect existing order line unit price or order total', async () => {
      // Step 1: Create a menu item with price $250.00
      const createMenuRes = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Special Tomahawk Feast',
          description: '32oz prime tomahawk steak with all sides',
          category: 'Mains',
          price: 250.0,
          isAvailable: true,
        });

      expect(createMenuRes.status).toBe(201);
      const tomahawkId = createMenuRes.body.data.item.id;

      // Step 2: Waiter creates Order A ordering 2x Tomahawk Feast ($250.00 * 2 = $500.00)
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'VIP Table 1',
          items: [{ menuItemId: tomahawkId, quantity: 2 }],
        });

      expect(orderRes.status).toBe(201);
      const orderA = orderRes.body.data.order;
      expect(orderA.lines[0].unitPrice).toBe(250.0);
      expect(orderA.totalPrice).toBe(500.0);

      // Step 3: Manager updates Tomahawk Feast price from $250.00 to $300.00
      const updateMenuRes = await request(app)
        .patch(`/api/menu/${tomahawkId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ price: 300.0 });

      expect(updateMenuRes.status).toBe(200);
      expect(updateMenuRes.body.data.item.price).toBe(300.0);

      // Step 4: Retrieve Order A and confirm historical unit price ($250.00) and total ($500.00) are preserved
      const getOrderARes = await request(app)
        .get(`/api/orders/${orderA.id}`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(getOrderARes.status).toBe(200);
      const retrievedOrderA = getOrderARes.body.data.order;
      expect(retrievedOrderA.lines[0].unitPrice).toBe(250.0);
      expect(retrievedOrderA.lines[0].lineTotal).toBe(500.0);
      expect(retrievedOrderA.totalPrice).toBe(500.0);

      // Step 5: Verify newly created Order B uses new price ($300.00)
      const orderBRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'VIP Table 2',
          items: [{ menuItemId: tomahawkId, quantity: 1 }],
        });

      expect(orderBRes.status).toBe(201);
      const orderB = orderBRes.body.data.order;
      expect(orderB.lines[0].unitPrice).toBe(300.0);
      expect(orderB.totalPrice).toBe(300.0);
    });
  });

  describe('4. Transaction & RBAC Integrity', () => {
    it('21. Transaction rollback: If one requested line is invalid, complete order creation is rejected and zero rows remain', async () => {
      const ordersBefore = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${managerToken}`);

      const countBefore = ordersBefore.body.data.count;

      // Attempt to create order with 1 valid item and 1 invalid unavailable item
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 7',
          items: [
            { menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }, // valid
            { menuItemId: 'a0000000-0000-0000-0000-000000000006', quantity: 1 }, // unavailable (86ed)
          ],
        });

      expect(res.status).toBe(400);

      // Verify no partial order was created
      const ordersAfter = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(ordersAfter.body.data.count).toBe(countBefore);
    });

    it('22-23. Role-based order access: Waiter only sees own orders; Manager sees all orders', async () => {
      // Waiter 1 creates Order 1
      const order1Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 1',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });
      const order1Id = order1Res.body.data.order.id;

      // Waiter 2 creates Order 2
      const order2Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter2Token}`)
        .send({
          tableNumber: 'Table 2',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000002', quantity: 1 }],
        });
      const order2Id = order2Res.body.data.order.id;

      // Waiter 1 listing orders: only sees Order 1
      const waiter1ListRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(waiter1ListRes.status).toBe(200);
      expect(waiter1ListRes.body.data.orders).toHaveLength(1);
      expect(waiter1ListRes.body.data.orders[0].id).toBe(order1Id);

      // Waiter 1 trying to get Order 2 by ID: Forbidden (403)
      const waiter1GetOrder2Res = await request(app)
        .get(`/api/orders/${order2Id}`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(waiter1GetOrder2Res.status).toBe(403);

      // Manager listing orders: sees both Order 1 and Order 2
      const managerListRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(managerListRes.status).toBe(200);
      expect(managerListRes.body.data.orders.length).toBeGreaterThanOrEqual(2);

      // Manager fetching Order 1 and Order 2 by ID: succeeds for both
      const managerGet1 = await request(app)
        .get(`/api/orders/${order1Id}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(managerGet1.status).toBe(200);

      const managerGet2 = await request(app)
        .get(`/api/orders/${order2Id}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(managerGet2.status).toBe(200);
    });
  });

  describe('5. Order Lifecycle State Transitions (Phase 5)', () => {
    it('24. Valid core lifecycle sequence: Placed -> Accepted -> Preparing -> Ready -> Served', async () => {
      // 1. Create order (initial state: 'placed')
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 21',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });
      const orderId = createRes.body.data.order.id;
      expect(createRes.body.data.order.status).toBe('placed');

      // 2. Transition Placed -> Accepted
      const acceptRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });
      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.order.status).toBe('accepted');

      // 3. Transition Accepted -> Preparing
      const prepRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'preparing' });
      expect(prepRes.status).toBe(200);
      expect(prepRes.body.data.order.status).toBe('preparing');

      // 4. Transition Preparing -> Ready
      const readyRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'ready' });
      expect(readyRes.status).toBe(200);
      expect(readyRes.body.data.order.status).toBe('ready');

      // 5. Transition Ready -> Served
      const servedRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'served' });
      expect(servedRes.status).toBe(200);
      expect(servedRes.body.data.order.status).toBe('served');
    });

    it('25-28. Invalid transitions rejected: Skipping states, moving backwards, modifying terminal states', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 22',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });
      const orderId = createRes.body.data.order.id;

      // 25. Skipping Accepted (Placed -> Preparing) rejected with 400
      const skipPrepRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'preparing' });
      expect(skipPrepRes.status).toBe(400);
      expect(skipPrepRes.body.message).toMatch(/Illegal state skip/i);

      // 26. Skipping to Served (Placed -> Served) rejected with 400
      const skipServedRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'served' });
      expect(skipServedRes.status).toBe(400);

      // Move Placed -> Accepted -> Preparing
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'preparing' });

      // 27. Backward transition (Preparing -> Placed or Preparing -> Accepted) rejected with 400
      const backwardRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });
      expect(backwardRes.status).toBe(400);
      expect(backwardRes.body.message).toMatch(/backward/i);

      // Move Preparing -> Ready -> Served
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'ready' });
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'served' });

      // 28. Modifying a Served order illegally is rejected with 400
      const servedEditRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'ready' });
      expect(servedEditRes.status).toBe(400);
      expect(servedEditRes.body.message).toMatch(/terminal state/i);
    });
  });

  describe('6. Order Cancellation Rules (Phase 5)', () => {
    it('29. Cancellation from Placed state succeeds', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 30',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });
      const orderId = createRes.body.data.order.id;

      const cancelRes = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ reason: 'Customer changed mind' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.order.status).toBe('cancelled');

      // Modifying a Cancelled order is rejected
      const modifyCancelledRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'preparing' });
      expect(modifyCancelledRes.status).toBe(400);
    });

    it('30. Cancellation from Accepted state succeeds', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 31',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });
      const orderId = createRes.body.data.order.id;

      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });

      const cancelRes = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ reason: 'Kitchen ingredient shortage' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.order.status).toBe('cancelled');
    });

    it('31-33. Cancellation rejected when order is in Preparing, Ready, or Served states', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 32',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });
      const orderId = createRes.body.data.order.id;

      // Progress to Preparing
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'preparing' });

      // 31. Attempting cancel from Preparing fails with 400
      const cancelPrepRes = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ reason: 'Try cancel while preparing' });

      expect(cancelPrepRes.status).toBe(400);
      expect(cancelPrepRes.body.message).toMatch(/cancellation is only permitted while an order is 'placed' or 'accepted'/i);

      // Progress to Ready
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'ready' });

      // 32. Attempting cancel from Ready fails with 400
      const cancelReadyRes = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send();
      expect(cancelReadyRes.status).toBe(400);

      // Progress to Served
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'served' });

      // 33. Attempting cancel from Served fails with 400
      const cancelServedRes = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send();
      expect(cancelServedRes.status).toBe(400);
    });
  });

  describe('7. Order Line Voiding & Total Recalculation (Phase 5)', () => {
    it('34-37. Voiding an order line requires a reason, marks the line without deleting, recalculates total, and preserves historical prices', async () => {
      // Create order with Veg Samosa (2x ₹90.00 = ₹180) and Paneer Tikka (1x ₹220.00 = ₹220), Total = ₹400.00
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 40',
          items: [
            { menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 2 },
            { menuItemId: 'a0000000-0000-0000-0000-000000000002', quantity: 1 },
          ],
        });
      const orderId = createRes.body.data.order.id;
      const samosaLineId = createRes.body.data.order.lines[0].id;
      const tikkaLineId = createRes.body.data.order.lines[1].id;
      expect(createRes.body.data.order.totalPrice).toBe(400.0);

      // 34. Voiding without a reason is rejected with 400
      const voidNoReasonRes = await request(app)
        .patch(`/api/orders/${orderId}/lines/${samosaLineId}/void`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ reason: '' });
      expect(voidNoReasonRes.status).toBe(400);

      // 35. Valid void with reason succeeds
      const voidRes = await request(app)
        .patch(`/api/orders/${orderId}/lines/${samosaLineId}/void`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ reason: 'Customer changed mind to soup' });

      expect(voidRes.status).toBe(200);
      const updatedOrder = voidRes.body.data.order;

      // 36. Voided line remains persisted with void reason
      expect(updatedOrder.lines).toHaveLength(2);
      const voidedLine = updatedOrder.lines.find((l: any) => l.id === samosaLineId);
      expect(voidedLine).toMatchObject({
        isVoided: true,
        voidReason: 'Customer changed mind to soup',
        unitPrice: 90.0, // Historical unit price remains intact
        quantity: 2,
      });

      // 37. Total price recalculated excluding voided line (only Paneer Tikka ₹220.00 remains)
      expect(updatedOrder.totalPrice).toBe(220.0);

      // Voiding an already-voided line is rejected
      const reVoidRes = await request(app)
        .patch(`/api/orders/${orderId}/lines/${samosaLineId}/void`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ reason: 'Void again' });
      expect(reVoidRes.status).toBe(400);
      expect(reVoidRes.body.message).toMatch(/already voided/i);
    });

    it('38. Voiding lines is prohibited on Served and Cancelled orders', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 41',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });
      const orderId = createRes.body.data.order.id;
      const lineId = createRes.body.data.order.lines[0].id;

      // Fast-forward to served
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

      // Void attempt on served order fails
      const voidServedRes = await request(app)
        .patch(`/api/orders/${orderId}/lines/${lineId}/void`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ reason: 'Try void after served' });

      expect(voidServedRes.status).toBe(400);
      expect(voidServedRes.body.message).toMatch(/served/i);
    });
  });

  describe('8. Adding Order Lines Before Served (Phase 5)', () => {
    it('39-40. Lines can be added to an open order before served, snapshotting price and updating total', async () => {
      // Create initial order with 1x Veg Samosa (₹90.00)
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 50',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });
      const orderId = createRes.body.data.order.id;
      expect(createRes.body.data.order.totalPrice).toBe(90.0);

      // Add Paneer Tikka (1x ₹220.00) while in Placed
      const addLineRes = await request(app)
        .post(`/api/orders/${orderId}/lines`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          menuItemId: 'a0000000-0000-0000-0000-000000000002',
          quantity: 1,
          specialInstructions: 'Mild spice',
        });

      expect(addLineRes.status).toBe(201);
      expect(addLineRes.body.data.order.lines).toHaveLength(2);
      expect(addLineRes.body.data.order.totalPrice).toBe(310.0); // 90.00 + 220.00 = 310.00

      // Progress to Preparing and add Chicken 65 (1x ₹240.00)
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'preparing' });

      const addLinePrepRes = await request(app)
        .post(`/api/orders/${orderId}/lines`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          menuItemId: 'a0000000-0000-0000-0000-000000000003',
          quantity: 1,
        });

      expect(addLinePrepRes.status).toBe(201);
      expect(addLinePrepRes.body.data.order.lines).toHaveLength(3);
      expect(addLinePrepRes.body.data.order.totalPrice).toBe(550.0); // 310.00 + 240.00 = 550.00

      // Progress to Served
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'ready' });
      await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'served' });

      // 40. Adding lines after served is rejected with 400
      const addLineServedRes = await request(app)
        .post(`/api/orders/${orderId}/lines`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          menuItemId: 'a0000000-0000-0000-0000-000000000001',
          quantity: 1,
        });
      expect(addLineServedRes.status).toBe(400);
      expect(addLineServedRes.body.message).toMatch(/served/i);
    });
  });

  describe('9. Role-Based Lifecycle Authorization (Phase 5)', () => {
    it('41. Waiter cannot transition another waiter’s order (403 Forbidden)', async () => {
      // Waiter 1 creates Order
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 60',
          items: [{ menuItemId: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        });
      const orderId = createRes.body.data.order.id;

      // Waiter 2 tries to transition Waiter 1's order -> 403 Forbidden
      const unauthorizedTransitionRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter2Token}`)
        .send({ status: 'accepted' });

      expect(unauthorizedTransitionRes.status).toBe(403);
      expect(unauthorizedTransitionRes.body.message).toMatch(/Forbidden/i);

      // Waiter 2 tries to cancel Waiter 1's order -> 403 Forbidden
      const unauthorizedCancelRes = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${waiter2Token}`)
        .send();

      expect(unauthorizedCancelRes.status).toBe(403);

      // Manager can transition Waiter 1's order -> 200 OK
      const managerTransitionRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'accepted' });

      expect(managerTransitionRes.status).toBe(200);
      expect(managerTransitionRes.body.data.order.status).toBe('accepted');
    });
  });
});

