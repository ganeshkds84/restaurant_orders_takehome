import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { dbPool, closeDbPool } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedDatabase } from '../src/db/seed.js';
import { userRepository } from '../src/users/user.repository.js';
import { signToken } from '../src/auth/jwt.js';

const app = createApp();

describe('Authentication & Role-Based Access Control (RBAC)', () => {
  const managerCredentials = {
    email: 'manager@restaurant.com',
    password: 'ManagerPassword123!',
  };

  const waiterCredentials = {
    email: 'waiter@restaurant.com',
    password: 'WaiterPassword123!',
  };

  let managerToken: string;
  let waiterToken: string;

  beforeAll(async () => {
    // Run migrations and seed test users before tests
    try {
      await runMigrations();
      await seedDatabase();
    } catch (err) {
      console.warn('Database initialization warning in test setup:', err);
    }
  });

  afterAll(async () => {
    await closeDbPool();
  });

  describe('1. Authentication Flow', () => {
    it('1. Valid login succeeds and returns JWT token and sanitized user profile', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(managerCredentials);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.token).toBeDefined();
      expect(typeof response.body.data.token).toBe('string');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(managerCredentials.email);
      expect(response.body.data.user.role).toBe('manager');

      managerToken = response.body.data.token;
    });

    it('2. Login with valid waiter credentials succeeds', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(waiterCredentials);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe('waiter');

      waiterToken = response.body.data.token;
    });

    it('3. Invalid password fails with 401 Unauthorized', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: managerCredentials.email,
          password: 'WrongPassword999!',
        });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/invalid email or password/i);
    });

    it('4. Unknown user fails with 401 Unauthorized', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent.user@restaurant.com',
          password: 'AnyPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/invalid email or password/i);
    });

    it('5. Password is NEVER returned in login or current-user responses', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send(managerCredentials);

      expect(loginRes.body.data.user.password).toBeUndefined();
      expect(loginRes.body.data.user.password_hash).toBeUndefined();
      expect(loginRes.body.data.user.passwordHash).toBeUndefined();

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.data.token}`);

      expect(meRes.body.data.user.password).toBeUndefined();
      expect(meRes.body.data.user.password_hash).toBeUndefined();
      expect(meRes.body.data.user.passwordHash).toBeUndefined();
    });

    it('6. Unauthenticated access to protected endpoint is rejected with 401', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
    });

    it('7. Authenticated current-user endpoint (/api/auth/me) returns the correct user', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(managerCredentials.email);
      expect(response.body.data.user.role).toBe('manager');
    });

    it('8. Logout endpoint succeeds for authenticated user', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  describe('2. Server-Side RBAC Authorization', () => {
    it('9. Manager can access manager-protected endpoint (/api/test-rbac/manager-only)', async () => {
      const response = await request(app)
        .get('/api/test-rbac/manager-only')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.user.role).toBe('manager');
    });

    it('10. Waiter CANNOT access manager-protected endpoint (returns 403 Forbidden)', async () => {
      const response = await request(app)
        .get('/api/test-rbac/manager-only')
        .set('Authorization', `Bearer ${waiterToken}`);

      expect(response.status).toBe(403);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/forbidden/i);
    });

    it('11. Authenticated waiter can access waiter-allowed endpoint (/api/test-rbac/waiter-only)', async () => {
      const response = await request(app)
        .get('/api/test-rbac/waiter-only')
        .set('Authorization', `Bearer ${waiterToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.user.role).toBe('waiter');
    });

    it('12. Both manager and waiter can access staff endpoint (/api/test-rbac/staff-only)', async () => {
      const managerRes = await request(app)
        .get('/api/test-rbac/staff-only')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(managerRes.status).toBe(200);
      expect(managerRes.body.status).toBe('success');

      const waiterRes = await request(app)
        .get('/api/test-rbac/staff-only')
        .set('Authorization', `Bearer ${waiterToken}`);

      expect(waiterRes.status).toBe(200);
      expect(waiterRes.body.status).toBe('success');
    });

    it('13. Missing, malformed, or invalid tokens are rejected with 401', async () => {
      const noHeaderRes = await request(app).get('/api/test-rbac/manager-only');
      expect(noHeaderRes.status).toBe(401);

      const invalidTokenRes = await request(app)
        .get('/api/test-rbac/manager-only')
        .set('Authorization', 'Bearer invalid.token.structure');
      expect(invalidTokenRes.status).toBe(401);

      const malformedHeaderRes = await request(app)
        .get('/api/test-rbac/manager-only')
        .set('Authorization', 'Basic 12345');
      expect(malformedHeaderRes.status).toBe(401);
    });
  });

  describe('3. Security & Anti-Tampering', () => {
    it('14. Client cannot elevate privileges by supplying a fake role parameter in request body, query, or headers', async () => {
      // Waiter attempts to access manager endpoint with spoofed role in query
      const querySpoofRes = await request(app)
        .get('/api/test-rbac/manager-only?role=manager')
        .set('Authorization', `Bearer ${waiterToken}`);
      expect(querySpoofRes.status).toBe(403);

      // Waiter attempts to access manager endpoint with spoofed role in custom header
      const headerSpoofRes = await request(app)
        .get('/api/test-rbac/manager-only')
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-user-role', 'manager')
        .set('role', 'manager');
      expect(headerSpoofRes.status).toBe(403);
    });

    it('15. Token forged with non-existent user is rejected by server database verification', async () => {
      const forgedToken = signToken({
        userId: '00000000-0000-0000-0000-000000000000',
        email: 'ghost@restaurant.com',
        role: 'manager',
      });

      const response = await request(app)
        .get('/api/test-rbac/manager-only')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(response.status).toBe(401);
    });

    it('16. Passwords in database are stored as bcrypt hashes, never plaintext', async () => {
      const user = await userRepository.findByEmail('manager@restaurant.com');
      expect(user).not.toBeNull();
      expect(user!.password_hash).not.toBe('ManagerPassword123!');
      expect(user!.password_hash).toMatch(/^\$2[aby]\$\d+\$/);
    });
  });
});
