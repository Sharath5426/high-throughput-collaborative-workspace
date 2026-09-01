import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createWorkspaceSchema, addMemberSchema } from '../validators';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { invalidateWorkspaceCache, readThroughCache } from '../utils/redis';

export async function createWorkspace(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const data = createWorkspaceSchema.parse(req.body);

    const workspace = await prisma.workspace.create({
      data: {
        name: data.name,
        description: data.description,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    await invalidateWorkspaceCache(workspace.id);

    // Create default initial project and board
    const project = await prisma.project.create({
      data: {
        name: 'General Project',
        description: 'Default workspace project',
        workspaceId: workspace.id,
      },
    });

    const board = await prisma.board.create({
      data: {
        name: 'Kanban Board',
        projectId: project.id,
      },
    });

    await prisma.column.createMany({
      data: [
        { name: 'TODO', position: 0, boardId: board.id },
        { name: 'IN PROGRESS', position: 1, boardId: board.id },
        { name: 'DONE', position: 2, boardId: board.id },
      ],
    });

    res.status(201).json({
      success: true,
      data: workspace,
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserWorkspaces(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;

    const workspaces = await readThroughCache(
      `workspace:list:${userId}`,
      120,
      async () => {
        const memberships = await prisma.workspaceMember.findMany({
          where: { userId },
          include: {
            workspace: {
              include: {
                members: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true, avatarUrl: true },
                    },
                  },
                },
                projects: {
                  select: { id: true, name: true, description: true },
                },
              },
            },
          },
        });

        return memberships.map((m) => m.workspace);
      }
    );

    res.status(200).json({
      success: true,
      data: workspaces,
    });
  } catch (err) {
    next(err);
  }
}

export async function getWorkspaceById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const workspace = await readThroughCache(
      `workspace:${id}`,
      120,
      async () => {
        const result = await prisma.workspace.findUnique({
          where: { id },
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true },
                },
              },
            },
            projects: {
              include: {
                boards: {
                  select: { id: true, name: true, description: true },
                },
              },
            },
          },
        });

        if (!result) return null;
        return result;
      }
    );

    if (!workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: workspace,
    });
  } catch (err) {
    next(err);
  }
}

export async function addMemberToWorkspace(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: workspaceId } = req.params;
    const data = addMemberSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!targetUser) {
      res.status(404).json({ success: false, error: 'User with specified email not found' });
      return;
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUser.id,
          workspaceId,
        },
      },
    });

    if (existingMember) {
      res.status(400).json({ success: false, error: 'User is already a member of this workspace' });
      return;
    }

    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
        role: data.role as 'ADMIN' | 'MEMBER',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    await invalidateWorkspaceCache(workspaceId);

    res.status(201).json({
      success: true,
      data: newMember,
    });
  } catch (err) {
    next(err);
  }
}

export async function removeWorkspaceMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: workspaceId, memberId } = req.params;

    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    res.status(200).json({
      success: true,
      message: 'Workspace member removed successfully',
    });
  } catch (err) {
    next(err);
  }
}
