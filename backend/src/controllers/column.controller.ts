import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createColumnSchema, updateColumnSchema } from '../validators';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function createColumn(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createColumnSchema.parse(req.body);

    let position = data.position;
    if (position === undefined) {
      const highestPositionColumn = await prisma.column.findFirst({
        where: { boardId: data.boardId },
        orderBy: { position: 'desc' },
      });
      position = highestPositionColumn ? highestPositionColumn.position + 1 : 0;
    }

    const column = await prisma.column.create({
      data: {
        name: data.name,
        boardId: data.boardId,
        position,
      },
      include: {
        tasks: true,
      },
    });

    res.status(201).json({
      success: true,
      data: column,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateColumn(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateColumnSchema.parse(req.body);

    const column = await prisma.column.update({
      where: { id },
      data,
      include: {
        tasks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: column,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteColumn(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    await prisma.column.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Column deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}
