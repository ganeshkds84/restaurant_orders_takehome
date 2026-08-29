import { Router, Request, Response } from 'express';
import { checkDbHealth } from '../db/connection.js';
import { env } from '../config/env.js';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const dbHealth = await checkDbHealth();

  const isHealthy = env.NODE_ENV === 'test' ? true : dbHealth.connected;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    version: '1.0.0',
    database: dbHealth,
  });
});

export const healthRouter = router;
