import { Router } from 'express';
import { getWorkspaceActivities } from '../controllers/activity.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeWorkspaceAccess } from '../middleware/workspace.middleware';

const router = Router();

router.use(authenticate);

router.get('/', authorizeWorkspaceAccess('workspace', 'workspaceId'), getWorkspaceActivities);

export default router;
