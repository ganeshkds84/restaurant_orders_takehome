import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireManager, requireStaff } from '../middleware/require-role.js';
import { menuService } from '../menu/menu.service.js';
import {
  createMenuItemSchema,
  updateMenuItemSchema,
  updateAvailabilitySchema,
  updateArchiveSchema,
  menuQuerySchema,
} from '../menu/menu.validator.js';
import { AppError } from '../errors/app-error.js';

const router = Router();

/**
 * All menu routes require authentication
 */
router.use(authenticate);

/**
 * GET /api/menu
 * List menu items (accessible by manager and waiter)
 */
router.get('/', requireStaff, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = menuQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw AppError.badRequest('Invalid query parameters', parseResult.error.flatten().fieldErrors);
    }

    const items = await menuService.getMenuItems(parseResult.data, req.user?.role);

    res.status(200).json({
      status: 'success',
      data: {
        items,
        count: items.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/menu/:id
 * Retrieve single menu item by ID (accessible by manager and waiter)
 */
router.get('/:id', requireStaff, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const item = await menuService.getMenuItemById(id);

    res.status(200).json({
      status: 'success',
      data: {
        item,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/menu
 * Create a new menu item (Manager only)
 */
router.post('/', requireManager, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = createMenuItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const created = await menuService.createMenuItem(parseResult.data);

    res.status(201).json({
      status: 'success',
      message: 'Menu item created successfully',
      data: {
        item: created,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/menu/:id
 * Update menu item attributes (Manager only)
 */
router.patch('/:id', requireManager, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parseResult = updateMenuItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const updated = await menuService.updateMenuItem(id, parseResult.data);

    res.status(200).json({
      status: 'success',
      message: 'Menu item updated successfully',
      data: {
        item: updated,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/menu/:id/availability
 * Update menu item availability status (Manager only)
 */
router.patch('/:id/availability', requireManager, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parseResult = updateAvailabilitySchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const updated = await menuService.setAvailability(id, parseResult.data.isAvailable);

    res.status(200).json({
      status: 'success',
      message: `Menu item marked as ${updated.isAvailable ? 'available' : 'unavailable'}`,
      data: {
        item: updated,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/menu/:id/archive
 * Toggle menu item archived status (Manager only)
 */
router.patch('/:id/archive', requireManager, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parseResult = updateArchiveSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const updated = await menuService.setArchiveStatus(id, parseResult.data.isArchived);

    res.status(200).json({
      status: 'success',
      message: `Menu item ${updated.isArchived ? 'archived' : 'restored'} successfully`,
      data: {
        item: updated,
      },
    });
  } catch (error) {
    next(error);
  }
});

export const menuRouter = router;
