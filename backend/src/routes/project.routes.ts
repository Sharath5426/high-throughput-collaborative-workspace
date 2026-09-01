import { Router } from 'express';
import { createProject, getProjectsByWorkspace, getProjectById } from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeWorkspaceAccess } from '../middleware/workspace.middleware';
import { handleIdempotency } from '../middleware/idempotency.middleware';

const router = Router();

router.use(authenticate);
router.use(handleIdempotency());

router.post('/', authorizeWorkspaceAccess('workspace', 'workspaceId'), createProject);
router.get('/', getProjectsByWorkspace);
router.get('/:id', authorizeWorkspaceAccess('project', 'id'), getProjectById);

export default router;
