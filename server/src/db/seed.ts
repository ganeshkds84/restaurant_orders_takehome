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
    name: 'Rajesh Sharma (Manager)',
    password: process.env.SEED_MANAGER_PASSWORD || 'ManagerPassword123!',
    role: 'manager',
  },
  {
    email: process.env.SEED_WAITER_EMAIL || 'waiter@restaurant.com',
    name: 'Arjun Kumar (Waiter)',
    password: process.env.SEED_WAITER_PASSWORD || 'WaiterPassword123!',
    role: 'waiter',
  },
  {
    email: 'waiter2@restaurant.com',
    name: 'Ananya Rao (Waiter 2)',
    password: 'WaiterPassword123!',
    role: 'waiter',
  },
  {
    email: 'waiter3@restaurant.com',
    name: 'Rahul Verma (Waiter 3)',
    password: 'WaiterPassword123!',
    role: 'waiter',
  },
  {
    email: 'waiter4@restaurant.com',
    name: 'Sneha Reddy (Waiter 4)',
    password: 'WaiterPassword123!',
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
    name: 'Veg Samosa',
    description: 'Crispy hand-crafted pastry filled with spiced potatoes, green peas, and fragrant herbs',
    category: 'Starters',
    price: 90.00,
    isAvailable: true,
  },
  {
    name: 'Paneer Tikka',
    description: 'Cottage cheese cubes marinated in yogurt and tandoori spices, char-grilled with peppers',
    category: 'Starters',
    price: 220.00,
    isAvailable: true,
  },
  {
    name: 'Chicken 65',
    description: 'Crispy spiced boneless chicken tossed with curry leaves, cracked mustard seeds, and chilies',
    category: 'Starters',
    price: 240.00,
    isAvailable: true,
  },
  {
    name: 'Butter Chicken',
    description: 'Tender tandoor-roasted chicken in a rich, velvety tomato and cashew butter gravy',
    category: 'Main Course',
    price: 320.00,
    isAvailable: true,
  },
  {
    name: 'Paneer Butter Masala',
    description: 'Fresh cottage cheese simmered in a mildly spiced, creamy butter gravy',
    category: 'Main Course',
    price: 280.00,
    isAvailable: true,
  },
  {
    name: 'Dal Makhani',
    description: 'Traditional slow-cooked black lentils simmered overnight with butter and cream',
    category: 'Main Course',
    price: 220.00,
    isAvailable: false, // 86ed / unavailable sample
  },
  {
    name: 'Chicken Biryani',
    description: 'Fragrant long-grain basmati rice cooked with marinated chicken, saffron, and aromatic spices',
    category: 'Main Course',
    price: 300.00,
    isAvailable: true,
  },
  {
    name: 'Veg Biryani',
    description: 'Fragrant basmati rice dum-cooked with garden vegetables, mint, and saffron spices',
    category: 'Main Course',
    price: 240.00,
    isAvailable: true,
  },
  {
    name: 'Butter Naan',
    description: 'Soft, pillowy tandoor-baked flatbread brushed with fresh butter',
    category: 'Breads / Rice',
    price: 60.00,
    isAvailable: true,
  },
  {
    name: 'Garlic Naan',
    description: 'Tandoor-baked flatbread topped with roasted garlic and chopped cilantro',
    category: 'Breads / Rice',
    price: 80.00,
    isAvailable: true,
  },
  {
    name: 'Jeera Rice',
    description: 'Aromatic basmati rice tempered with roasted cumin seeds and fresh ghee',
    category: 'Breads / Rice',
    price: 140.00,
    isAvailable: true,
  },
  {
    name: 'Gulab Jamun',
    description: 'Soft golden milk-solid dumplings soaked in warm rose and cardamom syrup',
    category: 'Desserts',
    price: 120.00,
    isAvailable: true,
  },
  {
    name: 'Rasmalai',
    description: 'Delicate cottage cheese patties soaked in sweetened saffron-cardamom thickened milk',
    category: 'Desserts',
    price: 150.00,
    isAvailable: true,
  },
  {
    name: 'Masala Chai',
    description: 'Freshly brewed Assam tea infused with crushed ginger, green cardamom, and spices',
    category: 'Beverages',
    price: 60.00,
    isAvailable: true,
  },
  {
    name: 'Mango Lassi',
    description: 'Chilled creamy yogurt smoothie blended with sweet Alphonso mango pulp',
    category: 'Beverages',
    price: 100.00,
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
