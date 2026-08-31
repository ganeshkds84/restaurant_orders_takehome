import { dbPool } from '../db/connection.js';
import {
  MenuItem,
  DbMenuItem,
  CreateMenuItemInput,
  UpdateMenuItemInput,
  MenuQueryFilters,
} from '../types/menu.js';
import { logger } from '../logging/logger.js';

export function mapToMenuItem(dbItem: DbMenuItem): MenuItem {
  return {
    id: dbItem.id,
    name: dbItem.name,
    description: dbItem.description || '',
    category: dbItem.category,
    price: typeof dbItem.price === 'number' ? dbItem.price : parseFloat(String(dbItem.price)),
    isAvailable: dbItem.is_available,
    isArchived: dbItem.is_archived,
    createdAt:
      dbItem.created_at instanceof Date
        ? dbItem.created_at.toISOString()
        : String(dbItem.created_at),
    updatedAt:
      dbItem.updated_at instanceof Date
        ? dbItem.updated_at.toISOString()
        : String(dbItem.updated_at),
  };
}

const INITIAL_SEED_ITEMS: DbMenuItem[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Truffle Fries',
    description: 'Crispy hand-cut fries tossed with white truffle oil and aged parmesan',
    category: 'Appetizers',
    price: '9.50',
    is_available: true,
    is_archived: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'Caesar Salad',
    description: 'Crisp romaine, house-made brioche croutons, shaved parmesan, garlic dressing',
    category: 'Appetizers',
    price: '12.00',
    is_available: true,
    is_archived: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    name: 'Margherita Pizza',
    description: 'San Marzano tomato sauce, fresh buffalo mozzarella, fresh basil, extra virgin olive oil',
    category: 'Mains',
    price: '16.50',
    is_available: true,
    is_archived: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    name: 'Grilled Salmon',
    description: 'Wild-caught Atlantic salmon with seasonal roasted asparagus and lemon herb butter',
    category: 'Mains',
    price: '24.00',
    is_available: true,
    is_archived: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    name: 'Ribeye Steak (12oz)',
    description: 'Prime dry-aged ribeye served with roasted garlic butter and rosemary potatoes',
    category: 'Mains',
    price: '32.00',
    is_available: true,
    is_archived: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000006',
    name: 'Fresh Pasta Carbonara',
    description: 'House-made egg tagliatelle with guanciale, pecorino romano, and farm egg yolk',
    category: 'Mains',
    price: '18.50',
    is_available: false, // 86ed / unavailable sample
    is_archived: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000007',
    name: 'Tiramisu',
    description: 'Espresso-soaked ladyfingers, mascarpone cream, and dark cocoa powder',
    category: 'Desserts',
    price: '8.50',
    is_available: true,
    is_archived: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000008',
    name: 'Sparkling Mineral Water',
    description: '750ml chilled bottle of Italian sparkling mineral water',
    category: 'Beverages',
    price: '4.00',
    is_available: true,
    is_archived: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  },
];

let memoryMenuItems: Map<string, DbMenuItem> = new Map(
  INITIAL_SEED_ITEMS.map((item) => [item.id, { ...item }])
);

function isConnectionError(err: unknown): boolean {
  if (!err) return false;
  const errorObj = err as { code?: string; message?: string; name?: string; errors?: Array<{ code?: string }> };
  if (errorObj.code === 'ECONNREFUSED' || errorObj.code === 'ENOTFOUND' || errorObj.code === 'ETIMEDOUT') return true;
  if (errorObj.name === 'AggregateError') return true;
  if (Array.isArray(errorObj.errors) && errorObj.errors.some((e) => e.code === 'ECONNREFUSED')) return true;
  return false;
}

export class MenuRepository {
  async findAll(filters: MenuQueryFilters = {}): Promise<DbMenuItem[]> {
    try {
      const conditions: string[] = [];
      const values: unknown[] = [];

      if (!filters.includeArchived) {
        conditions.push('is_archived = FALSE');
      }

      if (filters.category) {
        values.push(filters.category.trim());
        conditions.push(`LOWER(category) = LOWER($${values.length})`);
      }

      if (filters.isAvailable !== undefined) {
        values.push(filters.isAvailable);
        conditions.push(`is_available = $${values.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT id, name, description, category, price, is_available, is_archived, created_at, updated_at
        FROM menu_items
        ${whereClause}
        ORDER BY category ASC, name ASC
      `;

      const { rows } = await dbPool.query(query, values);
      return rows as DbMenuItem[];
    } catch (err) {
      if (isConnectionError(err)) {
        logger.debug('PostgreSQL unavailable; using in-memory store for findAll menu items');
        let items = Array.from(memoryMenuItems.values());

        if (!filters.includeArchived) {
          items = items.filter((item) => !item.is_archived);
        }

        if (filters.category) {
          const cat = filters.category.trim().toLowerCase();
          items = items.filter((item) => item.category.toLowerCase() === cat);
        }

        if (filters.isAvailable !== undefined) {
          items = items.filter((item) => item.is_available === filters.isAvailable);
        }

        return items.sort((a, b) => {
          const catCompare = a.category.localeCompare(b.category);
          return catCompare !== 0 ? catCompare : a.name.localeCompare(b.name);
        });
      }
      throw err;
    }
  }

  async findById(id: string): Promise<DbMenuItem | null> {
    try {
      const query = `
        SELECT id, name, description, category, price, is_available, is_archived, created_at, updated_at
        FROM menu_items
        WHERE id = $1
        LIMIT 1
      `;
      const { rows } = await dbPool.query(query, [id]);
      if (rows.length === 0) return null;
      return rows[0] as DbMenuItem;
    } catch (err) {
      if (isConnectionError(err)) {
        logger.debug('PostgreSQL unavailable; using in-memory store for findById menu item');
        return memoryMenuItems.get(id) || null;
      }
      throw err;
    }
  }

  async findByName(name: string): Promise<DbMenuItem | null> {
    const normalized = name.trim().toLowerCase();
    try {
      const query = `
        SELECT id, name, description, category, price, is_available, is_archived, created_at, updated_at
        FROM menu_items
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
      `;
      const { rows } = await dbPool.query(query, [normalized]);
      if (rows.length === 0) return null;
      return rows[0] as DbMenuItem;
    } catch (err) {
      if (isConnectionError(err)) {
        logger.debug('PostgreSQL unavailable; using in-memory store for findByName menu item');
        for (const item of memoryMenuItems.values()) {
          if (item.name.toLowerCase() === normalized) return item;
        }
        return null;
      }
      throw err;
    }
  }

  async create(data: CreateMenuItemInput): Promise<DbMenuItem> {
    const name = data.name.trim();
    const description = data.description ? data.description.trim() : '';
    const category = data.category.trim();
    const price = Number(data.price.toFixed(2));
    const isAvailable = data.isAvailable ?? true;

    try {
      const query = `
        INSERT INTO menu_items (name, description, category, price, is_available)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, description, category, price, is_available, is_archived, created_at, updated_at
      `;
      const { rows } = await dbPool.query(query, [
        name,
        description,
        category,
        price,
        isAvailable,
      ]);
      return rows[0] as DbMenuItem;
    } catch (err) {
      if (isConnectionError(err)) {
        logger.debug('PostgreSQL unavailable; creating menu item in in-memory store');
        const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newItem: DbMenuItem = {
          id,
          name,
          description,
          category,
          price: price.toFixed(2),
          is_available: isAvailable,
          is_archived: false,
          created_at: new Date(),
          updated_at: new Date(),
        };
        memoryMenuItems.set(id, newItem);
        return newItem;
      }
      throw err;
    }
  }

  async update(id: string, data: UpdateMenuItemInput): Promise<DbMenuItem | null> {
    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];

      if (data.name !== undefined) {
        values.push(data.name.trim());
        setClauses.push(`name = $${values.length}`);
      }
      if (data.description !== undefined) {
        values.push(data.description.trim());
        setClauses.push(`description = $${values.length}`);
      }
      if (data.category !== undefined) {
        values.push(data.category.trim());
        setClauses.push(`category = $${values.length}`);
      }
      if (data.price !== undefined) {
        values.push(Number(data.price.toFixed(2)));
        setClauses.push(`price = $${values.length}`);
      }
      if (data.isAvailable !== undefined) {
        values.push(data.isAvailable);
        setClauses.push(`is_available = $${values.length}`);
      }
      if (data.isArchived !== undefined) {
        values.push(data.isArchived);
        setClauses.push(`is_archived = $${values.length}`);
      }

      if (setClauses.length === 0) {
        return this.findById(id);
      }

      setClauses.push('updated_at = NOW()');
      values.push(id);

      const query = `
        UPDATE menu_items
        SET ${setClauses.join(', ')}
        WHERE id = $${values.length}
        RETURNING id, name, description, category, price, is_available, is_archived, created_at, updated_at
      `;

      const { rows } = await dbPool.query(query, values);
      if (rows.length === 0) return null;
      return rows[0] as DbMenuItem;
    } catch (err) {
      if (isConnectionError(err)) {
        logger.debug('PostgreSQL unavailable; updating menu item in in-memory store');
        const existing = memoryMenuItems.get(id);
        if (!existing) return null;

        const updated: DbMenuItem = {
          ...existing,
          name: data.name !== undefined ? data.name.trim() : existing.name,
          description: data.description !== undefined ? data.description.trim() : existing.description,
          category: data.category !== undefined ? data.category.trim() : existing.category,
          price: data.price !== undefined ? data.price.toFixed(2) : existing.price,
          is_available: data.isAvailable !== undefined ? data.isAvailable : existing.is_available,
          is_archived: data.isArchived !== undefined ? data.isArchived : existing.is_archived,
          updated_at: new Date(),
        };

        memoryMenuItems.set(id, updated);
        return updated;
      }
      throw err;
    }
  }

  async updateAvailability(id: string, isAvailable: boolean): Promise<DbMenuItem | null> {
    return this.update(id, { isAvailable });
  }

  async updateArchive(id: string, isArchived: boolean): Promise<DbMenuItem | null> {
    return this.update(id, { isArchived });
  }

  async delete(id: string): Promise<boolean> {
    try {
      const query = `DELETE FROM menu_items WHERE id = $1`;
      const result = await dbPool.query(query, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      if (isConnectionError(err)) {
        return memoryMenuItems.delete(id);
      }
      throw err;
    }
  }

  resetMemoryStore(): void {
    memoryMenuItems = new Map(INITIAL_SEED_ITEMS.map((item) => [item.id, { ...item }]));
  }
}

export const menuRepository = new MenuRepository();
