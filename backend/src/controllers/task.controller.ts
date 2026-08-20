import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from '../validators';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { emitBoardEvent } from '../sockets/socket.handler';

export async function createTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createTaskSchema.parse(req.body);

    const column = await prisma.column.findUnique({
      where: { id: data.columnId },
      select: { boardId: true, name: true },
    });

    if (!column) {
      res.status(404).json({ success: false, error: 'Destination column not found' });
      return;
    }

    const highestTask = await prisma.task.findFirst({
      where: { columnId: data.columnId },
      orderBy: { position: 'desc' },
    });
    const position = highestTask ? highestTask.position + 1 : 0;

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: column.name,
        position,
        columnId: data.columnId,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Broadcast Socket.IO event to room
    emitBoardEvent(column.boardId, 'task:created', { task, boardId: column.boardId });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateTaskSchema.parse(req.body);

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { column: { select: { boardId: true } } },
    });

    if (!existingTask) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Broadcast Socket.IO update
    emitBoardEvent(existingTask.column.boardId, 'task:updated', {
      task: updatedTask,
      boardId: existingTask.column.boardId,
    });

    res.status(200).json({
      success: true,
      data: updatedTask,
    });
  } catch (err) {
    next(err);
  }
}

export async function moveTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { columnId: newColumnId, position: newPosition } = moveTaskSchema.parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id },
      include: { column: { select: { boardId: true } } },
    });

    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const destinationColumn = await prisma.column.findUnique({
      where: { id: newColumnId },
      select: { boardId: true, name: true },
    });

    if (!destinationColumn) {
      res.status(404).json({ success: false, error: 'Destination column not found' });
      return;
    }

    const oldColumnId = task.columnId;
    const oldPosition = task.position;
    const boardId = task.column.boardId;

    // Transaction to update position indexes and move task
    await prisma.$transaction(async (tx) => {
      if (oldColumnId === newColumnId) {
        // Reordering within same column
        if (newPosition > oldPosition) {
          await tx.task.updateMany({
            where: {
              columnId: oldColumnId,
              position: { gt: oldPosition, lte: newPosition },
            },
            data: { position: { decrement: 1 } },
          });
        } else if (newPosition < oldPosition) {
          await tx.task.updateMany({
            where: {
              columnId: oldColumnId,
              position: { gte: newPosition, lt: oldPosition },
            },
            data: { position: { increment: 1 } },
          });
        }
      } else {
        // Moving across different columns
        await tx.task.updateMany({
          where: {
            columnId: oldColumnId,
            position: { gt: oldPosition },
          },
          data: { position: { decrement: 1 } },
        });

        await tx.task.updateMany({
          where: {
            columnId: newColumnId,
            position: { gte: newPosition },
          },
          data: { position: { increment: 1 } },
        });
      }

      await tx.task.update({
        where: { id },
        data: {
          columnId: newColumnId,
          position: newPosition,
          status: destinationColumn.name,
        },
      });
    });

    const movedTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Broadcast Socket.IO move event
    emitBoardEvent(boardId, 'task:moved', {
      taskId: id,
      sourceColumnId: oldColumnId,
      destinationColumnId: newColumnId,
      newPosition,
      task: movedTask,
      boardId,
    });

    res.status(200).json({
      success: true,
      data: movedTask,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { column: { select: { boardId: true } } },
    });

    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const boardId = task.column.boardId;

    await prisma.task.delete({
      where: { id },
    });

    // Broadcast Socket.IO deletion event
    emitBoardEvent(boardId, 'task:deleted', {
      taskId: id,
      columnId: task.columnId,
      boardId,
    });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}
