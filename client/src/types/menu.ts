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
