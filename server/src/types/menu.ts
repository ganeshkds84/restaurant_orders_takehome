export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  isAvailable: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DbMenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: string | number; // pg driver returns NUMERIC as string to preserve precision
  is_available: boolean;
  is_archived: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateMenuItemInput {
  name: string;
  description?: string;
  category: string;
  price: number;
  isAvailable?: boolean;
}

export interface UpdateMenuItemInput {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  isAvailable?: boolean;
  isArchived?: boolean;
}

export interface MenuQueryFilters {
  category?: string;
  includeArchived?: boolean;
  isAvailable?: boolean;
}

export type BulkUpdateAction = 'update_price' | 'update_availability';

export interface BulkUpdateMenuItemInput {
  itemIds: string[];
  action: BulkUpdateAction;
  price?: number;
  isAvailable?: boolean;
}

export interface BulkItemResult {
  itemId: string;
  name?: string;
  success: boolean;
  error?: string;
  message?: string;
  updatedItem?: MenuItem;
}

export interface BulkUpdateResult {
  results: BulkItemResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

