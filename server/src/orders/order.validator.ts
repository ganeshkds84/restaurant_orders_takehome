import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createOrderItemSchema = z.object({
  menuItemId: z
    .string({ required_error: 'Menu item ID is required' })
    .regex(uuidRegex, 'Menu item ID must be a valid UUID'),
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100 per line'),
  specialInstructions: z
    .string()
    .max(500, 'Special instructions cannot exceed 500 characters')
    .optional()
    .default(''),
});

export const createOrderSchema = z.object({
  tableNumber: z
    .string({ required_error: 'Table number is required' })
    .trim()
    .min(1, 'Table number cannot be empty')
    .max(50, 'Table number cannot exceed 50 characters'),
  items: z
    .array(createOrderItemSchema, { required_error: 'Order items are required' })
    .min(1, 'Order must contain at least one item'),
});

export const orderQuerySchema = z.object({
  primaryWaiterId: z.string().regex(uuidRegex, 'Invalid waiter ID').optional(),
  status: z
    .enum(['placed', 'accepted', 'preparing', 'ready', 'served', 'cancelled'])
    .optional(),
  isArchived: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  tableNumber: z.string().trim().max(50).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['placed', 'accepted', 'preparing', 'ready', 'served', 'cancelled'], {
    required_error: 'Target order status is required',
  }),
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export const voidOrderLineSchema = z.object({
  reason: z
    .string({ required_error: 'Void reason is required' })
    .trim()
    .min(1, 'Void reason is required and cannot be empty')
    .max(500, 'Void reason cannot exceed 500 characters'),
});

export const addOrderLineSchema = createOrderItemSchema;

