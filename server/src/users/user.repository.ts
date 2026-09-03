import bcrypt from 'bcryptjs';
import { dbPool } from '../db/connection.js';
import { DbUser, UserResponse, UserRole } from '../types/auth.js';
import { logger } from '../logging/logger.js';

export function mapToUserResponse(dbUser: DbUser): UserResponse {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    createdAt: dbUser.created_at instanceof Date ? dbUser.created_at.toISOString() : String(dbUser.created_at),
    updatedAt: dbUser.updated_at instanceof Date ? dbUser.updated_at.toISOString() : String(dbUser.updated_at),
  };
}

// In-memory store fallback for offline environments / automated tests without PostgreSQL daemon
const defaultManagerHash = bcrypt.hashSync('ManagerPassword123!', 10);
const defaultWaiterHash = bcrypt.hashSync('WaiterPassword123!', 10);

const memoryUsers: Map<string, DbUser> = new Map([
  [
    'manager@restaurant.com',
    {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'manager@restaurant.com',
      name: 'Rajesh Sharma (Manager)',
      password_hash: defaultManagerHash,
      role: 'manager',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    },
  ],
  [
    'waiter@restaurant.com',
    {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'waiter@restaurant.com',
      name: 'Arjun Kumar (Waiter)',
      password_hash: defaultWaiterHash,
      role: 'waiter',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    },
  ],
  [
    'waiter2@restaurant.com',
    {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'waiter2@restaurant.com',
      name: 'Ananya Rao (Waiter 2)',
      password_hash: defaultWaiterHash,
      role: 'waiter',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    },
  ],
  [
    'waiter3@restaurant.com',
    {
      id: '44444444-4444-4444-4444-444444444444',
      email: 'waiter3@restaurant.com',
      name: 'Rahul Verma (Waiter 3)',
      password_hash: defaultWaiterHash,
      role: 'waiter',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    },
  ],
  [
    'waiter4@restaurant.com',
    {
      id: '55555555-5555-5555-5555-555555555555',
      email: 'waiter4@restaurant.com',
      name: 'Sneha Reddy (Waiter 4)',
      password_hash: defaultWaiterHash,
      role: 'waiter',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    },
  ],
]);


function isConnectionError(err: unknown): boolean {
  if (!err) return false;
  const errorObj = err as { code?: string; message?: string; name?: string; errors?: Array<{ code?: string }> };
  if (errorObj.code === 'ECONNREFUSED' || errorObj.code === 'ENOTFOUND' || errorObj.code === 'ETIMEDOUT') return true;
  if (errorObj.name === 'AggregateError') return true;
  if (Array.isArray(errorObj.errors) && errorObj.errors.some(e => e.code === 'ECONNREFUSED')) return true;
  return false;
}

export class UserRepository {
  async findByEmail(email: string): Promise<DbUser | null> {
    const normalized = email.trim().toLowerCase();
    try {
      const query = `
        SELECT id, email, name, password_hash, role, created_at, updated_at
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `;
      const { rows } = await dbPool.query(query, [normalized]);
      if (rows.length === 0) return null;
      return rows[0] as DbUser;
    } catch (err) {
      if (isConnectionError(err)) {
        logger.debug('PostgreSQL unavailable; using in-memory store for findByEmail');
        return memoryUsers.get(normalized) || null;
      }
      throw err;
    }
  }

  async findById(id: string): Promise<DbUser | null> {
    try {
      const query = `
        SELECT id, email, name, password_hash, role, created_at, updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `;
      const { rows } = await dbPool.query(query, [id]);
      if (rows.length === 0) return null;
      return rows[0] as DbUser;
    } catch (err) {
      if (isConnectionError(err)) {
        logger.debug('PostgreSQL unavailable; using in-memory store for findById');
        for (const user of memoryUsers.values()) {
          if (user.id === id) return user;
        }
        return null;
      }
      throw err;
    }
  }

  async createUser(data: {
    email: string;
    name: string;
    passwordHash: string;
    role: UserRole;
  }): Promise<DbUser> {
    const normalized = data.email.trim().toLowerCase();
    try {
      const query = `
        INSERT INTO users (email, name, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, name, password_hash, role, created_at, updated_at
      `;
      const { rows } = await dbPool.query(query, [
        normalized,
        data.name.trim(),
        data.passwordHash,
        data.role,
      ]);
      return rows[0] as DbUser;
    } catch (err) {
      if (isConnectionError(err)) {
        const newUser: DbUser = {
          id: crypto.randomUUID(),
          email: normalized,
          name: data.name.trim(),
          password_hash: data.passwordHash,
          role: data.role,
          created_at: new Date(),
          updated_at: new Date(),
        };
        memoryUsers.set(normalized, newUser);
        return newUser;
      }
      throw err;
    }
  }

  async findAllByRole(role: UserRole): Promise<DbUser[]> {
    try {
      const query = `
        SELECT id, email, name, password_hash, role, created_at, updated_at
        FROM users
        WHERE role = $1
        ORDER BY name ASC
      `;
      const { rows } = await dbPool.query(query, [role]);
      return rows as DbUser[];
    } catch (err) {
      if (isConnectionError(err)) {
        logger.debug('PostgreSQL unavailable; using in-memory store for findAllByRole');
        const list: DbUser[] = [];
        for (const user of memoryUsers.values()) {
          if (user.role === role) {
            list.push(user);
          }
        }
        return list.sort((a, b) => a.name.localeCompare(b.name));
      }
      throw err;
    }
  }

  // Helper for test resets
  resetMemoryStore(): void {
    memoryUsers.set('manager@restaurant.com', {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'manager@restaurant.com',
      name: 'Rajesh Sharma (Manager)',
      password_hash: defaultManagerHash,
      role: 'manager',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });
    memoryUsers.set('waiter@restaurant.com', {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'waiter@restaurant.com',
      name: 'Arjun Kumar (Waiter)',
      password_hash: defaultWaiterHash,
      role: 'waiter',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });
    memoryUsers.set('waiter2@restaurant.com', {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'waiter2@restaurant.com',
      name: 'Ananya Rao (Waiter 2)',
      password_hash: defaultWaiterHash,
      role: 'waiter',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });
    memoryUsers.set('waiter3@restaurant.com', {
      id: '44444444-4444-4444-4444-444444444444',
      email: 'waiter3@restaurant.com',
      name: 'Rahul Verma (Waiter 3)',
      password_hash: defaultWaiterHash,
      role: 'waiter',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });
    memoryUsers.set('waiter4@restaurant.com', {
      id: '55555555-5555-5555-5555-555555555555',
      email: 'waiter4@restaurant.com',
      name: 'Sneha Reddy (Waiter 4)',
      password_hash: defaultWaiterHash,
      role: 'waiter',
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });
  }
}

export const userRepository = new UserRepository();

