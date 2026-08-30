import { Router } from 'express';
import { healthRouter } from './health.js';
import { authRouter } from './auth.js';
import { testRbacRouter } from './test-rbac.js';

const router = Router();

router.use('/', healthRouter);
router.use('/auth', authRouter);
router.use('/test-rbac', testRbacRouter);

export const apiRouter = router;

