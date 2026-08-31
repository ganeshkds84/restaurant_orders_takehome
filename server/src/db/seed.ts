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

export interface SeedMenuItemConfig {
  name: string;
  description: string;
  category: string;
  price: number;
  isAvailable: boolean;
}

export const DEFAULT_SEED_MENU_ITEMS: SeedMenuItemConfig[] = [
  {
    name: 'Truffle Fries',
    description: 'Crispy hand-cut fries tossed with white truffle oil and aged parmesan',
    category: 'Appetizers',
    price: 9.50,
    isAvailable: true,
  },
  {
    name: 'Caesar Salad',
    description: 'Crisp romaine, house-made brioche croutons, shaved parmesan, garlic dressing',
    category: 'Appetizers',
    price: 12.00,
    isAvailable: true,
  },
  {
    name: 'Margherita Pizza',
    description: 'San Marzano tomato sauce, fresh buffalo mozzarella, fresh basil, extra virgin olive oil',
    category: 'Mains',
    price: 16.50,
    isAvailable: true,
  },
  {
    name: 'Grilled Salmon',
    description: 'Wild-caught Atlantic salmon with seasonal roasted asparagus and lemon herb butter',
    category: 'Mains',
    price: 24.00,
    isAvailable: true,
  },
  {
    name: 'Ribeye Steak (12oz)',
    description: 'Prime dry-aged ribeye served with roasted garlic butter and rosemary potatoes',
    category: 'Mains',
    price: 32.00,
    isAvailable: true,
  },
  {
    name: 'Fresh Pasta Carbonara',
    description: 'House-made egg tagliatelle with guanciale, pecorino romano, and farm egg yolk',
    category: 'Mains',
    price: 18.50,
    isAvailable: false,
  },
  {
    name: 'Tiramisu',
    description: 'Espresso-soaked ladyfingers, mascarpone cream, and dark cocoa powder',
    category: 'Desserts',
    price: 8.50,
    isAvailable: true,
  },
  {
    name: 'Sparkling Mineral Water',
    description: '750ml chilled bottle of Italian sparkling mineral water',
    category: 'Beverages',
    price: 4.00,
    isAvailable: true,
  },
];

export async function seedDatabase(
  users: SeedUserConfig[] = DEFAULT_SEED_USERS,
  menuItems: SeedMenuItemConfig[] = DEFAULT_SEED_MENU_ITEMS
): Promise<void> {
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

    // Seed menu items
    for (const item of menuItems) {
      const normalizedName = item.name.trim().toLowerCase();
      const { rows } = await client.query(
        'SELECT id FROM menu_items WHERE LOWER(name) = LOWER($1)',
        [normalizedName]
      );

      if (rows.length === 0) {
        await client.query(
          `INSERT INTO menu_items (name, description, category, price, is_available)
           VALUES ($1, $2, $3, $4, $5)`,
          [item.name.trim(), item.description.trim(), item.category.trim(), item.price, item.isAvailable]
        );
        logger.info(`Seeded new menu item: ${item.name} ($${item.price.toFixed(2)})`);
      } else {
        await client.query(
          `UPDATE menu_items
           SET description = $1, category = $2, price = $3, is_available = $4, updated_at = NOW()
           WHERE LOWER(name) = LOWER($5)`,
          [item.description.trim(), item.category.trim(), item.price, item.isAvailable, normalizedName]
        );
        logger.info(`Updated existing seed menu item: ${item.name}`);
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
