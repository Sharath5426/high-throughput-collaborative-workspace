import { Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { createProjectSchema } from '../validators';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function createProject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createProjectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        workspaceId: data.workspaceId,
      },
    });

    // Create default board and columns
    const board = await prisma.board.create({
      data: {
        name: 'Main Board',
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
      data: {
        ...project,
        boards: [board],
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjectsByWorkspace(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaceId = (req.query.workspaceId || req.params.workspaceId) as string;

    const projects = await prisma.project.findMany({
      where: { workspaceId },
      include: {
        boards: {
          select: { id: true, name: true, description: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjectById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        boards: {
          include: {
            columns: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (err) {
    next(err);
  }
}
