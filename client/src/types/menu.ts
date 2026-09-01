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

export interface CreateMenuItemPayload {
  name: string;
  description?: string;
  category: string;
  price: number;
  isAvailable?: boolean;
}

export interface UpdateMenuItemPayload {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  isAvailable?: boolean;
  isArchived?: boolean;
}

export interface MenuFilterOptions {
  category?: string;
  includeArchived?: boolean;
  isAvailable?: boolean;
}

export type BulkUpdateAction = 'update_price' | 'update_availability';

export interface BulkUpdateMenuItemPayload {
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

export interface BulkUpdateResponse {
  results: BulkItemResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

