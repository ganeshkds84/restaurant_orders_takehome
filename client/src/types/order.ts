export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'cancelled';

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
  lines: OrderLine[];
}


export interface CreateOrderItemPayload {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
}

export interface CreateOrderPayload {
  tableNumber: string;
  items: CreateOrderItemPayload[];
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  reason?: string;
}

export interface CancelOrderPayload {
  reason?: string;
}

export interface VoidOrderLinePayload {
  reason: string;
}

export interface AddOrderLinePayload {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
}

