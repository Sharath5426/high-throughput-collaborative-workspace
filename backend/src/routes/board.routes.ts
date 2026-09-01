import { Router } from 'express';
import { createBoard, getBoardById } from '../controllers/board.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeWorkspaceAccess } from '../middleware/workspace.middleware';
import { handleIdempotency } from '../middleware/idempotency.middleware';

const router = Router();

router.use(authenticate);
router.use(handleIdempotency());

router.post('/', authorizeWorkspaceAccess('project', 'projectId'), createBoard);
router.get('/:id', authorizeWorkspaceAccess('board', 'id'), getBoardById);

export default router;
