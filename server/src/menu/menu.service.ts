import { menuRepository, mapToMenuItem } from './menu.repository.js';
import {
  MenuItem,
  CreateMenuItemInput,
  UpdateMenuItemInput,
  MenuQueryFilters,
  BulkUpdateMenuItemInput,
  BulkUpdateResult,
  BulkItemResult,
} from '../types/menu.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../logging/logger.js';

export class MenuService {
  async getMenuItems(
    filters: MenuQueryFilters = {},
    userRole?: string
  ): Promise<MenuItem[]> {
    // Only managers can view archived items
    const effectiveFilters: MenuQueryFilters = {
      ...filters,
      includeArchived: userRole === 'manager' ? filters.includeArchived : false,
    };

    const rows = await menuRepository.findAll(effectiveFilters);
    return rows.map(mapToMenuItem);
  }

  async getMenuItemById(id: string): Promise<MenuItem> {
    const row = await menuRepository.findById(id);
    if (!row) {
      throw AppError.notFound(`Menu item with ID '${id}' not found`);
    }
    return mapToMenuItem(row);
  }

  async createMenuItem(data: CreateMenuItemInput): Promise<MenuItem> {
    // Check if name is already taken
    const existing = await menuRepository.findByName(data.name);
    if (existing) {
      throw AppError.conflict(`A menu item with name '${data.name.trim()}' already exists`);
    }

    const created = await menuRepository.create(data);
    logger.info(`Menu item created: ${created.name} (${created.id}) by manager`);
    return mapToMenuItem(created);
  }

  async updateMenuItem(id: string, data: UpdateMenuItemInput): Promise<MenuItem> {
    // Check existence
    const existing = await menuRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Menu item with ID '${id}' not found`);
    }

    // If changing name, ensure uniqueness
    if (data.name && data.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await menuRepository.findByName(data.name);
      if (duplicate && duplicate.id !== id) {
        throw AppError.conflict(`A menu item with name '${data.name.trim()}' already exists`);
      }
    }

    const updated = await menuRepository.update(id, data);
    if (!updated) {
      throw AppError.notFound(`Menu item with ID '${id}' not found`);
    }

    logger.info(`Menu item updated: ${updated.name} (${updated.id})`);
    return mapToMenuItem(updated);
  }

  async setAvailability(id: string, isAvailable: boolean): Promise<MenuItem> {
    const existing = await menuRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Menu item with ID '${id}' not found`);
    }

    const updated = await menuRepository.updateAvailability(id, isAvailable);
    if (!updated) {
      throw AppError.notFound(`Menu item with ID '${id}' not found`);
    }

    logger.info(`Menu item availability changed: ${updated.name} -> available=${isAvailable}`);
    return mapToMenuItem(updated);
  }

  async setArchiveStatus(id: string, isArchived: boolean): Promise<MenuItem> {
    const existing = await menuRepository.findById(id);
    if (!existing) {
      throw AppError.notFound(`Menu item with ID '${id}' not found`);
    }

    const updated = await menuRepository.updateArchive(id, isArchived);
    if (!updated) {
      throw AppError.notFound(`Menu item with ID '${id}' not found`);
    }

    logger.info(`Menu item archive status changed: ${updated.name} -> archived=${isArchived}`);
    return mapToMenuItem(updated);
  }

  /**
   * Bulk update menu items (price or availability).
   * Reports per-item status and failure reasons rather than failing the entire batch.
   */
  async bulkUpdateMenuItems(input: BulkUpdateMenuItemInput): Promise<BulkUpdateResult> {
    const { itemIds, action, price, isAvailable } = input;
    const results: BulkItemResult[] = [];

    // Pre-validate action-specific parameters
    if (action === 'update_price') {
      if (price === undefined || typeof price !== 'number') {
        throw AppError.badRequest('Price must be a valid number when action is update_price');
      }
    } else if (action === 'update_availability') {
      if (isAvailable === undefined || typeof isAvailable !== 'boolean') {
        throw AppError.badRequest('isAvailable must be a boolean when action is update_availability');
      }
    }

    for (const id of itemIds) {
      try {
        const existing = await menuRepository.findById(id);
        if (!existing) {
          results.push({
            itemId: id,
            success: false,
            error: `Menu item with ID '${id}' not found`,
          });
          continue;
        }

        if (action === 'update_price') {
          // Negative price check or invalid precision
          if (price! < 0) {
            results.push({
              itemId: id,
              name: existing.name,
              success: false,
              error: `Invalid price ${price}: Price must be non-negative`,
            });
            continue;
          }

          if (Number(price!.toFixed(2)) !== price!) {
            results.push({
              itemId: id,
              name: existing.name,
              success: false,
              error: `Invalid price ${price}: Price cannot have more than 2 decimal places`,
            });
            continue;
          }

          const updated = await menuRepository.update(id, { price });
          if (!updated) {
            results.push({
              itemId: id,
              name: existing.name,
              success: false,
              error: 'Failed to update item price in database',
            });
            continue;
          }

          const mapped = mapToMenuItem(updated);
          results.push({
            itemId: id,
            name: existing.name,
            success: true,
            message: `Price updated to $${mapped.price.toFixed(2)}`,
            updatedItem: mapped,
          });
        } else if (action === 'update_availability') {
          const updated = await menuRepository.updateAvailability(id, isAvailable!);
          if (!updated) {
            results.push({
              itemId: id,
              name: existing.name,
              success: false,
              error: 'Failed to update item availability in database',
            });
            continue;
          }

          const mapped = mapToMenuItem(updated);
          results.push({
            itemId: id,
            name: existing.name,
            success: true,
            message: `Availability set to ${isAvailable ? 'Available' : 'Unavailable (86ed)'}`,
            updatedItem: mapped,
          });
        }
      } catch (err) {
        results.push({
          itemId: id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error during update',
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.length - succeeded;

    logger.info(
      `Bulk menu update completed for ${itemIds.length} items: action=${action}, succeeded=${succeeded}, failed=${failed}`
    );

    return {
      results,
      summary: {
        total: results.length,
        succeeded,
        failed,
      },
    };
  }
}

export const menuService = new MenuService();

