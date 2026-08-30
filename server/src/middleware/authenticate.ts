import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/jwt.js';
import { userRepository, mapToUserResponse } from '../users/user.repository.js';
import { AppError } from '../errors/app-error.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Authentication token required');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw AppError.unauthorized('Authentication token required');
    }

    const decoded = verifyToken(token);
    const user = await userRepository.findById(decoded.userId);

    if (!user) {
      throw AppError.unauthorized('User account no longer exists');
    }

    // Attach server-verified user to the request
    req.user = mapToUserResponse(user);
    next();
  } catch (error) {
    next(error);
  }
}
