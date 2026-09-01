import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createCanvasElement, deleteCanvasElement, getCanvasElements, updateCanvasElement } from '../controllers/canvas.controller';

const router = Router();

router.use(authenticate);
router.get('/', getCanvasElements);
router.post('/', createCanvasElement);
router.put('/:id', updateCanvasElement);
router.delete('/:id', deleteCanvasElement);

export default router;
