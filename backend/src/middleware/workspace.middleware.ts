import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { prisma } from '../utils/prisma';

export interface WorkspaceAuthorizedRequest extends AuthenticatedRequest {
  workspaceMember?: {
    id: string;
    role: string;
    userId: string;
    workspaceId: string;
  };
}

export function authorizeWorkspaceAccess(entityType: 'workspace' | 'project' | 'board' | 'task' = 'workspace', paramKey = 'id') {
  return async (req: WorkspaceAuthorizedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'User context missing' });
        return;
      }

      const entityId = req.params[paramKey] || req.body[paramKey] || (req.query[paramKey] as string);
      let workspaceId: string | null = null;

      if (entityType === 'workspace') {
        workspaceId = entityId;
      } else if (entityType === 'project') {
        const project = await prisma.project.findUnique({
          where: { id: entityId },
          select: { workspaceId: true },
        });
        if (project) workspaceId = project.workspaceId;
      } else if (entityType === 'board') {
        const board = await prisma.board.findUnique({
          where: { id: entityId },
          include: { project: { select: { workspaceId: true } } },
        });
        if (board) workspaceId = board.project.workspaceId;
      } else if (entityType === 'task') {
        const task = await prisma.task.findUnique({
          where: { id: entityId },
          include: {
            column: {
              include: {
                board: {
                  include: { project: { select: { workspaceId: true } } },
                },
              },
            },
          },
        });
        if (task) workspaceId = task.column.board.project.workspaceId;
      }

      if (!workspaceId) {
        res.status(404).json({ success: false, error: 'Resource or Workspace not found' });
        return;
      }

      const member = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId,
          },
        },
      });

      if (!member) {
        res.status(403).json({ success: false, error: 'Access denied: User is not a member of this workspace' });
        return;
      }

      req.workspaceMember = member;
      next();
    } catch (err) {
      next(err);
    }
  };
}
