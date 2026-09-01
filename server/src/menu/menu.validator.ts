import { z } from 'zod';

export const createMenuItemSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(1, 'Name cannot be empty')
    .max(255, 'Name cannot exceed 255 characters'),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional()
    .default(''),
  category: z
    .string({ required_error: 'Category is required' })
    .trim()
    .min(1, 'Category cannot be empty')
    .max(100, 'Category cannot exceed 100 characters'),
  price: z
    .number({ required_error: 'Price is required', invalid_type_error: 'Price must be a valid number' })
    .min(0, 'Price must be non-negative')
    .refine(
      (val) => Number(val.toFixed(2)) === val,
      'Price cannot have more than 2 decimal places'
    ),
  isAvailable: z.boolean().optional().default(true),
});

export const updateMenuItemSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name cannot be empty')
      .max(255, 'Name cannot exceed 255 characters')
      .optional(),
    description: z
      .string()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional(),
    category: z
      .string()
      .trim()
      .min(1, 'Category cannot be empty')
      .max(100, 'Category cannot exceed 100 characters')
      .optional(),
    price: z
      .number({ invalid_type_error: 'Price must be a valid number' })
      .min(0, 'Price must be non-negative')
      .refine(
        (val) => Number(val.toFixed(2)) === val,
        'Price cannot have more than 2 decimal places'
      )
      .optional(),
    isAvailable: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one field must be provided for update'
  );

export const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean({
    required_error: 'isAvailable boolean field is required',
    invalid_type_error: 'isAvailable must be a boolean',
  }),
});

export const updateArchiveSchema = z.object({
  isArchived: z.boolean({
    required_error: 'isArchived boolean field is required',
    invalid_type_error: 'isArchived must be a boolean',
  }),
});

export const menuQuerySchema = z.object({
  category: z.string().trim().optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  isAvailable: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val !== undefined ? val === 'true' : undefined)),
});

export const bulkMenuItemSchema = z.object({
  itemIds: z
    .array(z.string().trim().min(1, 'Item ID cannot be empty'), {
      required_error: 'itemIds array is required',
    })
    .min(1, 'At least one menu item ID must be provided')
    .max(100, 'Cannot process more than 100 items at once'),
  action: z.enum(['update_price', 'update_availability'], {
    required_error: "Action must be 'update_price' or 'update_availability'",
  }),
  price: z
    .number({ invalid_type_error: 'Price must be a valid number' })
    .optional(),
  isAvailable: z
    .boolean({ invalid_type_error: 'isAvailable must be a boolean' })
    .optional(),
});

