import { Router } from 'express';
import { healthRouter } from './health.js';
import { authRouter } from './auth.js';
import { testRbacRouter } from './test-rbac.js';
import { menuRouter } from './menu.js';
import { orderRouter } from './order.js';
import { dashboardRouter } from './dashboard.js';

const router = Router();

router.use('/', healthRouter);
router.use('/auth', authRouter);
router.use('/test-rbac', testRbacRouter);
router.use('/menu', menuRouter);
router.use('/orders', orderRouter);
router.use('/dashboard', dashboardRouter);

export const apiRouter = router;

