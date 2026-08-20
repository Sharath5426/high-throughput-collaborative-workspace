import { Router } from 'express';
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  addMemberToWorkspace,
  removeWorkspaceMember,
} from '../controllers/workspace.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeWorkspaceAccess } from '../middleware/workspace.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createWorkspace);
router.get('/', getUserWorkspaces);
router.get('/:id', authorizeWorkspaceAccess('workspace', 'id'), getWorkspaceById);
router.post('/:id/members', authorizeWorkspaceAccess('workspace', 'id'), addMemberToWorkspace);
router.delete('/:id/members/:memberId', authorizeWorkspaceAccess('workspace', 'id'), removeWorkspaceMember);

export default router;
