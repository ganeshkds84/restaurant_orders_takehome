import { dashboardRepository, DashboardRepository } from './dashboard.repository.js';
import { DashboardStatsResponse } from '../types/dashboard.js';
import { AppError } from '../errors/app-error.js';

export class DashboardService {
  constructor(private repo: DashboardRepository = dashboardRepository) {}

  async getDashboardStats(dateStr?: string): Promise<DashboardStatsResponse> {
    if (dateStr) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateStr) || isNaN(Date.parse(dateStr))) {
        throw AppError.badRequest('Invalid date format. Expected YYYY-MM-DD');
      }
    }

    return this.repo.getDashboardStats(dateStr);
  }
}

export const dashboardService = new DashboardService();
