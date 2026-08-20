import { Router } from 'express';
import { createTask, updateTask, moveTask, deleteTask } from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeWorkspaceAccess } from '../middleware/workspace.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createTask);
router.put('/:id', authorizeWorkspaceAccess('task', 'id'), updateTask);
router.put('/:id/move', authorizeWorkspaceAccess('task', 'id'), moveTask);
router.delete('/:id', authorizeWorkspaceAccess('task', 'id'), deleteTask);

export default router;
