import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { orderRepository } from '../src/orders/order.repository.js';
import { menuRepository } from '../src/menu/menu.repository.js';
import { userRepository } from '../src/users/user.repository.js';
import { signToken } from '../src/auth/jwt.js';
import { UserResponse } from '../src/types/auth.js';
import { OrderAuditEvent } from '../src/types/timeline.js';

describe('Order Audit History Timeline API (Phase 10 - Goal 9)', () => {
  const app = createApp();

  const mockManager: UserResponse = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Rajesh Sharma (Manager)',
    email: 'manager@restaurant.com',
    role: 'manager',
  };

  const mockWaiter1: UserResponse = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Arjun Kumar (Waiter)',
    email: 'waiter@restaurant.com',
    role: 'waiter',
  };

  const mockWaiter2: UserResponse = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Ananya Rao (Waiter 2)',
    email: 'waiter2@restaurant.com',
    role: 'waiter',
  };

  const mockWaiter3: UserResponse = {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Rahul Verma (Waiter 3)',
    email: 'waiter3@restaurant.com',
    role: 'waiter',
  };

  let managerToken: string;
  let waiter1Token: string;
  let waiter2Token: string;
  let waiter3Token: string;

  let steakItem: any;
  let wineItem: any;
  let dessertItem: any;

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
      name: 'Ribeye Steak',
      description: 'Prime cut with garlic herb butter',
      category: 'Mains',
      price: 34.5,
      isAvailable: true,
    });

    wineItem = await menuRepository.create({
      name: 'Cabernet Sauvignon',
      description: 'Full-bodied red wine',
      category: 'Beverages',
      price: 12.0,
      isAvailable: true,
    });

    dessertItem = await menuRepository.create({
      name: 'Chocolate Lava Cake',
      description: 'Warm molten chocolate cake',
      category: 'Desserts',
      price: 9.5,
      isAvailable: true,
    });
  });

  describe('1. Timeline Event Recording Across Order Lifecycle', () => {
    it('1. Automatically records order_created event upon order placement with actor information', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 4',
          items: [
            {
              menuItemId: steakItem.id,
              quantity: 2,
              specialInstructions: 'Medium rare please',
            },
          ],
        });

      expect(createRes.status).toBe(201);
      const orderId = createRes.body.data.order.id;

      const timelineRes = await request(app)
        .get(`/api/orders/${orderId}/timeline`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(timelineRes.status).toBe(200);
      const events: OrderAuditEvent[] = timelineRes.body.data.timeline;
      expect(events).toHaveLength(1);

      const createEvent = events[0];
      expect(createEvent.eventType).toBe('order_created');
      expect(createEvent.actorId).toBe(mockWaiter1.id);
      expect(createEvent.actorName).toBe(mockWaiter1.name);
      expect(createEvent.actorRole).toBe('waiter');
      expect(createEvent.newStatus).toBe('placed');
      expect(createEvent.notes).toContain('Table 4');
    });

    it('2. Records status_changed events with old and new status and transition reasons', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 7',
          items: [{ menuItemId: steakItem.id, quantity: 1 }],
        });

      const orderId = createRes.body.data.order.id;

      // Transition: placed -> accepted
      const acceptRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'accepted' });
      expect(acceptRes.status).toBe(200);

      // Transition: accepted -> preparing (by manager)
      const prepRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'preparing', reason: 'Kitchen station started order' });
      expect(prepRes.status).toBe(200);

      // Transition: preparing -> ready
      const readyRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'ready' });
      expect(readyRes.status).toBe(200);

      // Transition: ready -> served
      const servedRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'served' });
      expect(servedRes.status).toBe(200);

      // Retrieve complete timeline
      const timelineRes = await request(app)
        .get(`/api/orders/${orderId}/timeline`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(timelineRes.status).toBe(200);
      const events: OrderAuditEvent[] = timelineRes.body.data.timeline;
      expect(events).toHaveLength(5); // 1 create + 4 status transitions

      expect(events[1].eventType).toBe('status_changed');
      expect(events[1].oldStatus).toBe('placed');
      expect(events[1].newStatus).toBe('accepted');
      expect(events[1].actorName).toBe(mockWaiter1.name);

      expect(events[2].eventType).toBe('status_changed');
      expect(events[2].oldStatus).toBe('accepted');
      expect(events[2].newStatus).toBe('preparing');
      expect(events[2].actorName).toBe(mockManager.name);
      expect(events[2].reason).toBe('Kitchen station started order');

      expect(events[3].eventType).toBe('status_changed');
      expect(events[3].oldStatus).toBe('preparing');
      expect(events[3].newStatus).toBe('ready');

      expect(events[4].eventType).toBe('status_changed');
      expect(events[4].oldStatus).toBe('ready');
      expect(events[4].newStatus).toBe('served');
    });

    it('3. Records cancellation event with cancellation reason and actor', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 9',
          items: [{ menuItemId: steakItem.id, quantity: 1 }],
        });

      const orderId = createRes.body.data.order.id;

      const cancelRes = await request(app)
        .post(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ reason: 'Guest had an emergency and left' });

      expect(cancelRes.status).toBe(200);

      const timelineRes = await request(app)
        .get(`/api/orders/${orderId}/timeline`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(timelineRes.status).toBe(200);
      const events = timelineRes.body.data.timeline;
      expect(events).toHaveLength(2);

      const cancelEvent = events[1];
      expect(cancelEvent.eventType).toBe('status_changed');
      expect(cancelEvent.oldStatus).toBe('placed');
      expect(cancelEvent.newStatus).toBe('cancelled');
      expect(cancelEvent.reason).toBe('Guest had an emergency and left');
      expect(cancelEvent.actorId).toBe(mockWaiter1.id);
    });

    it('4. Records line_added event with historical item name, price snapshot, quantity, and notes', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 12',
          items: [{ menuItemId: steakItem.id, quantity: 1 }],
        });

      const orderId = createRes.body.data.order.id;

      const addLineRes = await request(app)
        .post(`/api/orders/${orderId}/lines`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          menuItemId: wineItem.id,
          quantity: 2,
          specialInstructions: 'Chilled glass',
        });

      expect(addLineRes.status).toBe(201);

      const timelineRes = await request(app)
        .get(`/api/orders/${orderId}/timeline`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      const events = timelineRes.body.data.timeline;
      expect(events).toHaveLength(2);

      const lineEvent = events[1];
      expect(lineEvent.eventType).toBe('line_added');
      expect(lineEvent.itemName).toBe('Cabernet Sauvignon');
      expect(lineEvent.quantity).toBe(2);
      expect(lineEvent.unitPrice).toBe(12.0);
      expect(lineEvent.notes).toBe('Chilled glass');
      expect(lineEvent.actorName).toBe(mockWaiter1.name);
    });

    it('5. Records line_voided event with mandatory void reason and snapshot values', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 15',
          items: [
            { menuItemId: steakItem.id, quantity: 1 },
            { menuItemId: wineItem.id, quantity: 1 },
          ],
        });

      const order = createRes.body.data.order;
      const wineLine = order.lines.find((l: any) => l.itemName === 'Cabernet Sauvignon');

      const voidRes = await request(app)
        .patch(`/api/orders/${order.id}/lines/${wineLine.id}/void`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ reason: 'Customer changed mind to beer' });

      expect(voidRes.status).toBe(200);

      const timelineRes = await request(app)
        .get(`/api/orders/${order.id}/timeline`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      const events = timelineRes.body.data.timeline;
      expect(events).toHaveLength(2);

      const voidEvent = events[1];
      expect(voidEvent.eventType).toBe('line_voided');
      expect(voidEvent.itemName).toBe('Cabernet Sauvignon');
      expect(voidEvent.reason).toBe('Customer changed mind to beer');
      expect(voidEvent.actorName).toBe(mockWaiter1.name);
    });

    it('6. Records collaborator_added and collaborator_removed events with target user details', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 20',
          items: [{ menuItemId: dessertItem.id, quantity: 2 }],
        });

      const orderId = createRes.body.data.order.id;

      // Add Charlie Waiter as collaborator
      const addCollabRes = await request(app)
        .post(`/api/orders/${orderId}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: mockWaiter2.id });

      expect(addCollabRes.status).toBe(201);

      // Remove Charlie Waiter
      const removeCollabRes = await request(app)
        .delete(`/api/orders/${orderId}/collaborators/${mockWaiter2.id}`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(removeCollabRes.status).toBe(200);

      const timelineRes = await request(app)
        .get(`/api/orders/${orderId}/timeline`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      const events = timelineRes.body.data.timeline;
      expect(events).toHaveLength(3); // create, add collab, remove collab

      expect(events[1].eventType).toBe('collaborator_added');
      expect(events[1].notes).toContain(mockWaiter2.name);
      expect(events[1].actorId).toBe(mockWaiter1.id);

      expect(events[2].eventType).toBe('collaborator_removed');
      expect(events[2].notes).toContain(mockWaiter2.name);
      expect(events[2].actorId).toBe(mockWaiter1.id);
    });
  });

  describe('2. Authorization and Access Control for Timeline', () => {
    it('7. Manager can view the timeline for any order in the restaurant', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 30',
          items: [{ menuItemId: steakItem.id, quantity: 1 }],
        });

      const orderId = createRes.body.data.order.id;

      const timelineRes = await request(app)
        .get(`/api/orders/${orderId}/timeline`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(timelineRes.status).toBe(200);
      expect(timelineRes.body.data.timeline).toBeDefined();
    });

    it('8. Assigned collaborator can view the timeline for the order', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 31',
          items: [{ menuItemId: steakItem.id, quantity: 1 }],
        });

      const orderId = createRes.body.data.order.id;

      // Assign Waiter 2 as collaborator
      await request(app)
        .post(`/api/orders/${orderId}/collaborators`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ userId: mockWaiter2.id });

      // Waiter 2 accesses timeline
      const timelineRes = await request(app)
        .get(`/api/orders/${orderId}/timeline`)
        .set('Authorization', `Bearer ${waiter2Token}`);

      expect(timelineRes.status).toBe(200);
      expect(timelineRes.body.data.timeline).toHaveLength(2);
    });

    it('9. Unassigned waiter is denied access to view the order timeline (403 Forbidden)', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 32',
          items: [{ menuItemId: steakItem.id, quantity: 1 }],
        });

      const orderId = createRes.body.data.order.id;

      // Waiter 3 is not primary and not a collaborator
      const timelineRes = await request(app)
        .get(`/api/orders/${orderId}/timeline`)
        .set('Authorization', `Bearer ${waiter3Token}`);

      expect(timelineRes.status).toBe(403);
      expect(timelineRes.body.message).toContain('Forbidden');
    });

    it('10. Unauthenticated requests receive 401 Unauthorized', async () => {
      const timelineRes = await request(app)
        .get('/api/orders/00000000-0000-0000-0000-000000000000/timeline');

      expect(timelineRes.status).toBe(401);
    });
  });

  describe('3. Immutability & Rejection Atomicity', () => {
    it('11. Timeline events cannot be modified or deleted via API endpoints', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 50',
          items: [{ menuItemId: steakItem.id, quantity: 1 }],
        });

      const orderId = createRes.body.data.order.id;

      // Attempt PUT on timeline
      const putRes = await request(app)
        .put(`/api/orders/${orderId}/timeline`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ notes: 'Tampered notes' });
      expect([404, 405]).toContain(putRes.status);

      // Attempt DELETE on timeline
      const deleteRes = await request(app)
        .delete(`/api/orders/${orderId}/timeline`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect([404, 405]).toContain(deleteRes.status);
    });

    it('12. Failed / rejected operations do not create false success timeline events', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({
          tableNumber: 'Table 51',
          items: [{ menuItemId: steakItem.id, quantity: 1 }],
        });

      const orderId = createRes.body.data.order.id;

      // Attempt illegal status jump: placed -> served directly (violates state machine)
      const invalidTransitionRes = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${waiter1Token}`)
        .send({ status: 'served' });

      expect(invalidTransitionRes.status).toBe(400);

      // Timeline must still contain only the original order_created event
      const timelineRes = await request(app)
        .get(`/api/orders/${orderId}/timeline`)
        .set('Authorization', `Bearer ${waiter1Token}`);

      expect(timelineRes.status).toBe(200);
      const events = timelineRes.body.data.timeline;
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('order_created');
    });
  });
});
