import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}
