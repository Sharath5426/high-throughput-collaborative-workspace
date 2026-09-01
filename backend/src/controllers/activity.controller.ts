import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getWorkspaceActivities(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = (req.query.workspaceId || req.params.workspaceId) as string;

    if (!workspaceId) {
      res.status(400).json({ success: false, error: 'workspaceId query parameter required' });
      return;
    }

    const activities = await prisma.activityLog.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (err) {
    next(err);
  }
}

export async function createActivityRecord(
  workspaceId: string,
  userId: string,
  action: string,
  details?: any,
  projectId?: string,
  boardId?: string
) {
  try {
    return await prisma.activityLog.create({
      data: {
        workspaceId,
        userId,
        action,
        details: details || {},
        projectId: projectId || null,
        boardId: boardId || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  } catch (err) {
    console.error('Failed to create ActivityLog record:', err);
    return null;
  }
}
