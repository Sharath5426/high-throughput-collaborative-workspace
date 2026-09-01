import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from '../validators';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { emitBoardEvent, emitUserEvent } from '../sockets/socket.handler';
import { createActivityRecord } from './activity.controller';
import { createNotificationRecord } from './notification.controller';
import { invalidateBoardCache, invalidateProjectCache, invalidateWorkspaceCache } from '../utils/redis';

export async function createTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const data = createTaskSchema.parse(req.body);
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body?.idempotencyKey;

    const column = await prisma.column.findUnique({
      where: { id: data.columnId },
      include: { board: { include: { project: { select: { workspaceId: true } } } } },
    });

    if (!column) {
      res.status(404).json({ success: false, error: 'Destination column not found' });
      return;
    }

    const workspaceId = column.board.project.workspaceId;
    const boardId = column.boardId;

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

    // Create Audit Activity Log
    const activity = await createActivityRecord(
      workspaceId,
      userId,
      'TASK_CREATED',
      { taskId: task.id, title: task.title, column: column.name },
      column.board.projectId,
      boardId
    );

    // Create Notification if task assigned to another user
    if (task.assigneeId && task.assigneeId !== userId) {
      const notification = await createNotificationRecord(
        task.assigneeId,
        'TASK_ASSIGNED',
        'New Task Assigned',
        `You were assigned to task "${task.title}"`,
        `/dashboard`
      );
      if (notification) emitUserEvent(task.assigneeId, 'notification:new', notification);
    }

    await invalidateBoardCache(boardId);
    await invalidateProjectCache(column.board.projectId);
    await invalidateWorkspaceCache(workspaceId);

    // Broadcast Socket.IO events
    emitBoardEvent(boardId, 'task:created', { task, boardId, idempotencyKey });
    if (activity) emitBoardEvent(boardId, 'activity:new', activity);

    res.status(201).json({
      success: true,
      data: task,
      idempotencyKey,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const data = updateTaskSchema.parse(req.body);
    const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body?.idempotencyKey;

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        column: {
          include: { board: { include: { project: { select: { workspaceId: true } } } } },
        },
      },
    });

    if (!existingTask) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const boardId = existingTask.column.boardId;
    const workspaceId = existingTask.column.board.project.workspaceId;

    // Optimistic Concurrency Control (OCC) Check
    if (expectedVersion !== undefined && existingTask.version !== expectedVersion) {
      res.status(409).json({
        success: false,
        error: 'Conflict detected: Task has been modified by another user',
        serverTask: existingTask,
        clientTask: { id, ...data, version: expectedVersion },
      });
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
        version: { increment: 1 },
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Create Audit Activity Log
    const activity = await createActivityRecord(
      workspaceId,
      userId,
      'TASK_UPDATED',
      { taskId: updatedTask.id, title: updatedTask.title, version: updatedTask.version },
      existingTask.column.board.projectId,
      boardId
    );

    // Create Notification if assignee changed
    if (updatedTask.assigneeId && updatedTask.assigneeId !== existingTask.assigneeId && updatedTask.assigneeId !== userId) {
      const notification = await createNotificationRecord(
        updatedTask.assigneeId,
        'TASK_ASSIGNED',
        'Task Assignment Updated',
        `You were assigned to task "${updatedTask.title}"`,
        `/dashboard`
      );
      if (notification) emitUserEvent(updatedTask.assigneeId, 'notification:new', notification);
    }

    await invalidateBoardCache(boardId);
    await invalidateProjectCache(existingTask.column.board.projectId);
    await invalidateWorkspaceCache(workspaceId);

    // Broadcast Socket.IO update & activity
    emitBoardEvent(boardId, 'task:updated', {
      task: updatedTask,
      boardId,
      idempotencyKey,
    });
    if (activity) emitBoardEvent(boardId, 'activity:new', activity);

    res.status(200).json({
      success: true,
      data: updatedTask,
      idempotencyKey,
    });
  } catch (err) {
    next(err);
  }
}

export async function moveTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { columnId: newColumnId, position: newPosition } = moveTaskSchema.parse(req.body);
    const expectedVersion = req.body.version !== undefined ? Number(req.body.version) : undefined;
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body?.idempotencyKey;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        column: {
          include: { board: { include: { project: { select: { workspaceId: true } } } } },
        },
      },
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

    // OCC Version Check
    if (expectedVersion !== undefined && task.version !== expectedVersion) {
      res.status(409).json({
        success: false,
        error: 'Conflict detected: Task has been modified by another user',
        serverTask: task,
        clientTask: { id, columnId: newColumnId, position: newPosition, version: expectedVersion },
      });
      return;
    }

    const oldColumnId = task.columnId;
    const oldPosition = task.position;
    const boardId = task.column.boardId;
    const workspaceId = task.column.board.project.workspaceId;

    // Transaction to update position indexes, version, and move task
    await prisma.$transaction(async (tx) => {
      if (oldColumnId === newColumnId) {
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
          version: { increment: 1 },
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

    // Create Audit Activity Log
    const activity = await createActivityRecord(
      workspaceId,
      userId,
      'TASK_MOVED',
      { taskId: id, title: task.title, from: task.status, to: destinationColumn.name },
      task.column.board.projectId,
      boardId
    );

    await invalidateBoardCache(boardId);
    await invalidateProjectCache(task.column.board.projectId);
    await invalidateWorkspaceCache(workspaceId);

    // Broadcast Socket.IO move event with idempotencyKey
    emitBoardEvent(boardId, 'task:moved', {
      taskId: id,
      sourceColumnId: oldColumnId,
      destinationColumnId: newColumnId,
      newPosition,
      task: movedTask,
      boardId,
      idempotencyKey,
    });
    if (activity) emitBoardEvent(boardId, 'activity:new', activity);

    res.status(200).json({
      success: true,
      data: movedTask,
      idempotencyKey,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body?.idempotencyKey;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        column: {
          include: { board: { include: { project: { select: { workspaceId: true } } } } },
        },
      },
    });

    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    const boardId = task.column.boardId;
    const workspaceId = task.column.board.project.workspaceId;

    await prisma.task.delete({
      where: { id },
    });

    // Create Audit Activity Log
    const activity = await createActivityRecord(
      workspaceId,
      userId,
      'TASK_DELETED',
      { taskId: id, title: task.title },
      task.column.board.projectId,
      boardId
    );

    await invalidateBoardCache(boardId);
    await invalidateProjectCache(task.column.board.projectId);
    await invalidateWorkspaceCache(workspaceId);

    // Broadcast Socket.IO deletion event
    emitBoardEvent(boardId, 'task:deleted', {
      taskId: id,
      columnId: task.columnId,
      boardId,
      idempotencyKey,
    });
    if (activity) emitBoardEvent(boardId, 'activity:new', activity);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      idempotencyKey,
    });
  } catch (err) {
    next(err);
  }
}
