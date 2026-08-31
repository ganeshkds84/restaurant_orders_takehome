import { Router } from 'express';
import { healthRouter } from './health.js';
import { authRouter } from './auth.js';
import { testRbacRouter } from './test-rbac.js';
import { menuRouter } from './menu.js';

const router = Router();

router.use('/', healthRouter);
router.use('/auth', authRouter);
router.use('/test-rbac', testRbacRouter);
router.use('/menu', menuRouter);

export const apiRouter = router;

