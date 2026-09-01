export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'cancelled';

export interface DbOrder {
  id: string;
  table_number: string;
  primary_waiter_id: string;
  status: OrderStatus;
  is_archived: boolean;
  total_price: string | number;
  created_at: Date | string;
  updated_at: Date | string;
  primary_waiter_name?: string;
  primary_waiter_email?: string;
}

export interface DbOrderCollaborator {
  id: string;
  order_id: string;
  user_id: string;
  created_at: Date | string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
}

export interface OrderCollaborator {
  id: string;
  orderId: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
}

export interface DbOrderLine {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name: string;
  quantity: number;
  unit_price: string | number;
  special_instructions: string;
  is_voided: boolean;
  void_reason: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface OrderLine {
  id: string;
  orderId: string;
  menuItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  specialInstructions: string;
  isVoided: boolean;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  tableNumber: string;
  primaryWaiterId: string;
  primaryWaiter?: {
    id: string;
    name: string;
    email: string;
  };
  collaborators?: OrderCollaborator[];
  status: OrderStatus;
  isArchived: boolean;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderWithLines extends Order {
  lines: OrderLine[];
  collaborators: OrderCollaborator[];
}

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
}

export interface CreateOrderInput {
  tableNumber: string;
  items: CreateOrderItemInput[];
}

export interface OrderQueryFilters {
  primaryWaiterId?: string;
  waiterId?: string; // Query orders where user is primary waiter OR collaborator
  status?: OrderStatus;
  isArchived?: boolean;
  tableNumber?: string;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
  reason?: string;
}

export interface CancelOrderInput {
  reason?: string;
}

export interface VoidOrderLineInput {
  reason: string;
}

export interface AddOrderLineInput {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
}

export interface AddCollaboratorInput {
  userId: string;
}

