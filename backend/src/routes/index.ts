import { Router } from 'express';
import authRoutes from './auth.routes';
import workspaceRoutes from './workspace.routes';
import projectRoutes from './project.routes';
import boardRoutes from './board.routes';
import columnRoutes from './column.routes';
import taskRoutes from './task.routes';
import activityRoutes from './activity.routes';
import notificationRoutes from './notification.routes';
import canvasRoutes from './canvas.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/projects', projectRoutes);
router.use('/boards', boardRoutes);
router.use('/columns', columnRoutes);
router.use('/tasks', taskRoutes);
router.use('/activity', activityRoutes);
router.use('/notifications', notificationRoutes);
router.use('/canvas', canvasRoutes);

export default router;
