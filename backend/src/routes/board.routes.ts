import { Router } from 'express';
import { createBoard, getBoardById } from '../controllers/board.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeWorkspaceAccess } from '../middleware/workspace.middleware';

const router = Router();

router.use(authenticate);

router.post('/', authorizeWorkspaceAccess('project', 'projectId'), createBoard);
router.get('/:id', authorizeWorkspaceAccess('board', 'id'), getBoardById);

export default router;
