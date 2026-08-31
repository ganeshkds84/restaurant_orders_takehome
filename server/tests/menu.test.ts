import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
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

const waiterUser = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'waiter@restaurant.com',
  name: 'Sam Chen (Waiter)',
  role: 'waiter' as const,
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

describe('Menu Item Management & Availability API (Phase 3)', () => {
  beforeEach(() => {
    menuRepository.resetMemoryStore();
    userRepository.resetMemoryStore();
  });

  describe('1. CRUD & Validation', () => {
    it('1. Valid menu item creation succeeds for manager with 201 status and correct fields', async () => {
      const payload = {
        name: 'Gourmet Truffle Burger',
        description: 'Brioche bun, prime wagyu patty, black truffle aioli, aged cheddar',
        category: 'Mains',
        price: 19.5,
        isAvailable: true,
      };

      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.item).toMatchObject({
        name: 'Gourmet Truffle Burger',
        description: 'Brioche bun, prime wagyu patty, black truffle aioli, aged cheddar',
        category: 'Mains',
        price: 19.5,
        isAvailable: true,
        isArchived: false,
      });
      expect(res.body.data.item.id).toBeDefined();
      expect(res.body.data.item.createdAt).toBeDefined();
    });

    it('2. Missing required fields (name, category, price) are rejected with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          description: 'No name, category or price',
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Validation failed');
      expect(res.body.details).toHaveProperty('name');
      expect(res.body.details).toHaveProperty('category');
      expect(res.body.details).toHaveProperty('price');
    });

    it('3. Empty or whitespace-only name is rejected with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: '   ',
          category: 'Mains',
          price: 15.0,
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.details).toHaveProperty('name');
    });

    it('4. Invalid price (negative, non-numeric, >2 decimal places) is rejected with 400', async () => {
      // Negative price
      const negRes = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Negative Price Dish',
          category: 'Mains',
          price: -5.0,
        });
      expect(negRes.status).toBe(400);

      // Price with more than 2 decimal places
      const decRes = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Micro Cents Dish',
          category: 'Mains',
          price: 12.345,
        });
      expect(decRes.status).toBe(400);
      expect(decRes.body.message).toContain('Validation failed');

      // Non-numeric price
      const strRes = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Invalid Price String Dish',
          category: 'Mains',
          price: 'not-a-number',
        });
      expect(strRes.status).toBe(400);
    });

    it('5. Duplicate menu item name is rejected with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Margherita Pizza', // already in seed
          category: 'Mains',
          price: 17.0,
        });

      expect(res.status).toBe(409);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('already exists');
    });

    it('6. Valid menu item retrieval succeeds by ID', async () => {
      const res = await request(app)
        .get('/api/menu/a0000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${waiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.item.name).toBe('Truffle Fries');
      expect(res.body.data.item.price).toBe(9.5);
    });

    it('7. Missing menu item ID returns 404 Not Found', async () => {
      const res = await request(app)
        .get('/api/menu/00000000-0000-0000-0000-000000000999')
        .set('Authorization', `Bearer ${waiterToken}`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('not found');
    });

    it('8. Valid menu item update succeeds for manager', async () => {
      const res = await request(app)
        .patch('/api/menu/a0000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          price: 11.0,
          description: 'Updated truffle fries description',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.item.price).toBe(11.0);
      expect(res.body.data.item.description).toBe('Updated truffle fries description');

      // Verify persistent on subsequent retrieval
      const getRes = await request(app)
        .get('/api/menu/a0000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${waiterToken}`);
      expect(getRes.body.data.item.price).toBe(11.0);
    });

    it('9. Invalid update payload (empty body, negative price) is rejected with 400', async () => {
      const emptyRes = await request(app)
        .patch('/api/menu/a0000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(emptyRes.status).toBe(400);

      const invalidPriceRes = await request(app)
        .patch('/api/menu/a0000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ price: -10 });

      expect(invalidPriceRes.status).toBe(400);
    });

    it('10. Menu list can be filtered by category', async () => {
      const res = await request(app)
        .get('/api/menu?category=Appetizers')
        .set('Authorization', `Bearer ${waiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      for (const item of res.body.data.items) {
        expect(item.category).toBe('Appetizers');
      }
    });
  });

  describe('2. Authorization & RBAC', () => {
    it('11. Unauthenticated requests to menu endpoints are rejected with 401 Unauthorized', async () => {
      const listRes = await request(app).get('/api/menu');
      expect(listRes.status).toBe(401);

      const createRes = await request(app).post('/api/menu').send({
        name: 'Unauth Dish',
        category: 'Mains',
        price: 10,
      });
      expect(createRes.status).toBe(401);

      const toggleRes = await request(app)
        .patch('/api/menu/a0000000-0000-0000-0000-000000000001/availability')
        .send({ isAvailable: false });
      expect(toggleRes.status).toBe(401);
    });

    it('12. Waiter CANNOT create menu items (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          name: 'Waiter Created Dish',
          category: 'Mains',
          price: 15.0,
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain("Forbidden: role 'waiter' is not authorized");
    });

    it('13. Waiter CANNOT edit menu items (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/api/menu/a0000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          price: 1.0,
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });

    it('14. Waiter CANNOT change availability (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/api/menu/a0000000-0000-0000-0000-000000000001/availability')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          isAvailable: false,
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });

    it('15. Waiter CANNOT archive menu items (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/api/menu/a0000000-0000-0000-0000-000000000001/archive')
        .set('Authorization', `Bearer ${waiterToken}`)
        .send({
          isArchived: true,
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });

    it('16. Client cannot bypass RBAC by supplying fake role in body, headers, or query', async () => {
      const res = await request(app)
        .post('/api/menu?role=manager')
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-role', 'manager')
        .send({
          name: 'Hacked Dish',
          category: 'Mains',
          price: 15.0,
          role: 'manager',
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });
  });

  describe('3. Availability & Archiving', () => {
    it('17. Valid availability toggle by manager succeeds and persists', async () => {
      // Toggle to unavailable (86'd)
      const toggleOffRes = await request(app)
        .patch('/api/menu/a0000000-0000-0000-0000-000000000001/availability')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ isAvailable: false });

      expect(toggleOffRes.status).toBe(200);
      expect(toggleOffRes.body.data.item.isAvailable).toBe(false);

      // Verify persistent on retrieval
      const getRes = await request(app)
        .get('/api/menu/a0000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${waiterToken}`);
      expect(getRes.body.data.item.isAvailable).toBe(false);

      // Toggle back to available
      const toggleOnRes = await request(app)
        .patch('/api/menu/a0000000-0000-0000-0000-000000000001/availability')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ isAvailable: true });

      expect(toggleOnRes.status).toBe(200);
      expect(toggleOnRes.body.data.item.isAvailable).toBe(true);
    });

    it('18. Invalid availability payload is rejected with 400', async () => {
      const res = await request(app)
        .patch('/api/menu/a0000000-0000-0000-0000-000000000001/availability')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ isAvailable: 'not-a-bool' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('19. Archiving menu item excludes it from default listing', async () => {
      // Archive Truffle Fries
      const archiveRes = await request(app)
        .patch('/api/menu/a0000000-0000-0000-0000-000000000001/archive')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ isArchived: true });

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.item.isArchived).toBe(true);

      // Default listing does not include archived items
      const listRes = await request(app)
        .get('/api/menu')
        .set('Authorization', `Bearer ${waiterToken}`);

      const found = listRes.body.data.items.find(
        (i: { id: string }) => i.id === 'a0000000-0000-0000-0000-000000000001'
      );
      expect(found).toBeUndefined();

      // Manager can include archived items with ?includeArchived=true
      const managerListRes = await request(app)
        .get('/api/menu?includeArchived=true')
        .set('Authorization', `Bearer ${managerToken}`);

      const managerFound = managerListRes.body.data.items.find(
        (i: { id: string }) => i.id === 'a0000000-0000-0000-0000-000000000001'
      );
      expect(managerFound).toBeDefined();
      expect(managerFound.isArchived).toBe(true);

      // Waiter cannot view archived items even if passing ?includeArchived=true
      const waiterListRes = await request(app)
        .get('/api/menu?includeArchived=true')
        .set('Authorization', `Bearer ${waiterToken}`);

      const waiterFound = waiterListRes.body.data.items.find(
        (i: { id: string }) => i.id === 'a0000000-0000-0000-0000-000000000001'
      );
      expect(waiterFound).toBeUndefined();
    });
  });
});
