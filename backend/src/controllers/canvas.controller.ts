import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createActivityRecord } from './activity.controller';
import { emitBoardEvent } from '../sockets/socket.handler';

async function ensureBoardAccess(userId: string, boardId: string): Promise<boolean> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { project: { select: { workspaceId: true } } },
  });

  if (!board) return false;

  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: board.project.workspaceId,
      },
    },
  });

  return !!member;
}

const canvasElementSchema = z.object({
  boardId: z.string().uuid(),
  type: z.enum(['sticky', 'shape', 'text', 'draw']).default('sticky'),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().min(40),
  height: z.number().finite().min(40),
  rotation: z.number().finite().optional().default(0),
  content: z.string().optional().default(''),
  style: z.record(z.any()).optional(),
  points: z.array(z.number()).optional(),
  version: z.number().int().nonnegative().optional().default(1),
});

const updateCanvasSchema = z.object({
  type: z.enum(['sticky', 'shape', 'text', 'draw']).optional(),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  width: z.number().finite().min(40).optional(),
  height: z.number().finite().min(40).optional(),
  rotation: z.number().finite().optional(),
  content: z.string().optional(),
  style: z.record(z.any()).optional(),
  points: z.array(z.number()).optional(),
  version: z.number().int().nonnegative(),
});

function boardContext(boardId: string) {
  return prisma.board.findUnique({
    where: { id: boardId },
    include: {
      project: { select: { workspaceId: true, id: true } },
    },
  });
}

export async function getCanvasElements(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const boardId = (req.query.boardId as string) || req.params.boardId;
    if (!boardId) {
      res.status(400).json({ success: false, error: 'boardId is required' });
      return;
    }

    const items = await prisma.canvasElement.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' },
      include: {
        creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    res.status(200).json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
}

export async function createCanvasElement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const payload = canvasElementSchema.parse(req.body);

    const allowed = await ensureBoardAccess(userId, payload.boardId);
    if (!allowed) {
      res.status(403).json({ success: false, error: 'Access denied: user is not a member of this workspace' });
      return;
    }

    const board = await boardContext(payload.boardId);
    if (!board) {
      res.status(404).json({ success: false, error: 'Board not found' });
      return;
    }

    const element = await prisma.canvasElement.create({
      data: {
        boardId: payload.boardId,
        workspaceId: board.project.workspaceId,
        createdBy: userId,
        type: payload.type,
        x: payload.x,
        y: payload.y,
        width: payload.width,
        height: payload.height,
        rotation: payload.rotation,
        content: payload.content || null,
        style: payload.style || {},
        points: payload.points || undefined,
      },
      include: {
        creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    await createActivityRecord(
      board.project.workspaceId,
      userId,
      'CANVAS_ELEMENT_CREATED',
      { elementId: element.id, type: element.type, boardId: board.id },
      board.projectId,
      board.id
    );

    emitBoardEvent(board.id, 'canvas:element:created', { element, boardId: board.id });

    res.status(201).json({ success: true, data: element });
  } catch (err) {
    next(err);
  }
}

export async function updateCanvasElement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const payload = updateCanvasSchema.parse(req.body);

    const existing = await prisma.canvasElement.findUnique({
      where: { id },
      include: {
        board: { include: { project: { select: { workspaceId: true, id: true } } } },
      },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Canvas element not found' });
      return;
    }

    const allowed = await ensureBoardAccess(userId, existing.boardId);
    if (!allowed) {
      res.status(403).json({ success: false, error: 'Access denied: user is not a member of this workspace' });
      return;
    }

    if (existing.version !== payload.version) {
      res.status(409).json({
        success: false,
        error: 'Conflict detected: canvas element was modified by another user',
        serverElement: existing,
        clientElement: { id, ...payload },
      });
      return;
    }

    const updated = await prisma.canvasElement.update({
      where: { id },
      data: {
        ...(payload.type !== undefined && { type: payload.type }),
        ...(payload.x !== undefined && { x: payload.x }),
        ...(payload.y !== undefined && { y: payload.y }),
        ...(payload.width !== undefined && { width: payload.width }),
        ...(payload.height !== undefined && { height: payload.height }),
        ...(payload.rotation !== undefined && { rotation: payload.rotation }),
        ...(payload.content !== undefined && { content: payload.content }),
        ...(payload.style !== undefined && { style: payload.style }),
        ...(payload.points !== undefined && { points: payload.points }),
        version: { increment: 1 },
      },
      include: {
        creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    await createActivityRecord(
      existing.board.project.workspaceId,
      userId,
      'CANVAS_ELEMENT_UPDATED',
      { elementId: updated.id, type: updated.type, boardId: existing.boardId },
      existing.board.projectId,
      existing.boardId
    );

    emitBoardEvent(existing.boardId, 'canvas:element:updated', { element: updated, boardId: existing.boardId });

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteCanvasElement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.canvasElement.findUnique({
      where: { id },
      include: {
        board: { include: { project: { select: { workspaceId: true, id: true } } } },
      },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Canvas element not found' });
      return;
    }

    const allowed = await ensureBoardAccess(userId, existing.boardId);
    if (!allowed) {
      res.status(403).json({ success: false, error: 'Access denied: user is not a member of this workspace' });
      return;
    }

    await prisma.canvasElement.delete({ where: { id } });

    await createActivityRecord(
      existing.board.project.workspaceId,
      userId,
      'CANVAS_ELEMENT_DELETED',
      { elementId: existing.id, type: existing.type, boardId: existing.boardId },
      existing.board.projectId,
      existing.boardId
    );

    emitBoardEvent(existing.boardId, 'canvas:element:deleted', { elementId: existing.id, boardId: existing.boardId });

    res.status(200).json({ success: true, data: { id } });
  } catch (err) {
    next(err);
  }
}
