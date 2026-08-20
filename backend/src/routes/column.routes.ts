import { Router } from 'express';
import { createColumn, updateColumn, deleteColumn } from '../controllers/column.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeWorkspaceAccess } from '../middleware/workspace.middleware';

const router = Router();

router.use(authenticate);

router.post('/', authorizeWorkspaceAccess('board', 'boardId'), createColumn);
router.put('/:id', updateColumn);
router.delete('/:id', deleteColumn);

export default router;
