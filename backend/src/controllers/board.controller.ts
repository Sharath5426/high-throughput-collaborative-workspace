import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createBoardSchema } from '../validators';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { invalidateBoardCache, invalidateProjectCache, readThroughCache } from '../utils/redis';

export async function createBoard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createBoardSchema.parse(req.body);

    const board = await prisma.board.create({
      data: {
        name: data.name,
        description: data.description,
        projectId: data.projectId,
      },
    });

    await prisma.column.createMany({
      data: [
        { name: 'TODO', position: 0, boardId: board.id },
        { name: 'IN PROGRESS', position: 1, boardId: board.id },
        { name: 'DONE', position: 2, boardId: board.id },
      ],
    });

    const createdBoard = await prisma.board.findUnique({
      where: { id: board.id },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: { tasks: true },
        },
      },
    });

    await invalidateBoardCache(board.id);
    await invalidateProjectCache(data.projectId);

    res.status(201).json({
      success: true,
      data: createdBoard,
    });
  } catch (err) {
    next(err);
  }
}

export async function getBoardById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const board = await readThroughCache(
      `board:${id}`,
      120,
      async () => {
        const result = await prisma.board.findUnique({
          where: { id },
          include: {
            project: {
              select: { id: true, name: true, workspaceId: true },
            },
            columns: {
              orderBy: { position: 'asc' },
              include: {
                tasks: {
                  orderBy: { position: 'asc' },
                  include: {
                    assignee: {
                      select: { id: true, name: true, email: true, avatarUrl: true },
                    },
                  },
                },
              },
            },
          },
        });

        return result;
      }
    );

    if (!board) {
      res.status(404).json({ success: false, error: 'Board not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (err) {
    next(err);
  }
}
