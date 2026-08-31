import { menuRepository, mapToMenuItem } from './menu.repository.js';
import {
  MenuItem,
  CreateMenuItemInput,
  UpdateMenuItemInput,
  MenuQueryFilters,
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
}

export const menuService = new MenuService();
