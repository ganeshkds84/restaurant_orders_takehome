import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../auth/auth.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../errors/app-error.js';

const loginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

const router = Router();

/**
 * POST /api/auth/login
 * Public login endpoint with credentials validation
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const { email, password } = parseResult.data;
    const result = await authService.login(email, password);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Protected endpoint returning current authenticated user profile
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('Not authenticated');
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Endpoint for client-side logout confirmation
 */
router.post('/logout', authenticate, (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

export const authRouter = router;
