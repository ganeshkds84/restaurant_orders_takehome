import path from 'path';
import { fileURLToPath } from 'url';
import { dbPool } from './connection.js';
import { hashPassword } from '../auth/password.js';
import { logger } from '../logging/logger.js';
import { runMigrations } from './migrate.js';

export interface SeedUserConfig {
  email: string;
  name: string;
  password: string;
  role: 'manager' | 'waiter';
}

export const DEFAULT_SEED_USERS: SeedUserConfig[] = [
  {
    email: process.env.SEED_MANAGER_EMAIL || 'manager@restaurant.com',
    name: 'Alex Rivera (Manager)',
    password: process.env.SEED_MANAGER_PASSWORD || 'ManagerPassword123!',
    role: 'manager',
  },
  {
    email: process.env.SEED_WAITER_EMAIL || 'waiter@restaurant.com',
    name: 'Sam Chen (Waiter)',
    password: process.env.SEED_WAITER_PASSWORD || 'WaiterPassword123!',
    role: 'waiter',
  },
];

export async function seedDatabase(users: SeedUserConfig[] = DEFAULT_SEED_USERS): Promise<void> {
  let client;
  try {
    client = await dbPool.connect();
  } catch (connErr) {
    logger.warn('PostgreSQL database unavailable, skipping seed script (fallback mode active)', {
      error: connErr instanceof Error ? connErr.message : String(connErr),
    });
    return;
  }

  try {
    logger.info('Starting database seeding...');

    // First ensure migrations have run
    await runMigrations();

    for (const u of users) {
      const normalizedEmail = u.email.trim().toLowerCase();
      const passwordHash = await hashPassword(u.password);

      const { rows } = await client.query(
        'SELECT id, role FROM users WHERE LOWER(email) = LOWER($1)',
        [normalizedEmail]
      );

      if (rows.length === 0) {
        await client.query(
          `INSERT INTO users (email, name, password_hash, role)
           VALUES ($1, $2, $3, $4)`,
          [normalizedEmail, u.name, passwordHash, u.role]
        );
        logger.info(`Seeded new user: ${normalizedEmail} [${u.role}]`);
      } else {
        // Update password hash and name to keep development credentials synced
        await client.query(
          `UPDATE users
           SET name = $1, password_hash = $2, role = $3, updated_at = NOW()
           WHERE LOWER(email) = LOWER($4)`,
          [u.name, passwordHash, u.role, normalizedEmail]
        );
        logger.info(`Updated existing seed user: ${normalizedEmail} [${u.role}]`);
      }
    }

    logger.info('Database seeding completed successfully.');
  } catch (error) {
    logger.error('Database seeding failed', { error });
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Allow direct execution via tsx/node
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  seedDatabase()
    .then(() => {
      logger.info('Seed script completed.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seed script error', { error: err });
      process.exit(1);
    });
}
