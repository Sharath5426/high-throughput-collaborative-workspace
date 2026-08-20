import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateToken } from '../utils/jwt';
import { registerSchema, loginSchema } from '../validators';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      res.status(400).json({ success: false, error: 'User with this email already exists' });
      return;
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // Automatically create a default personal workspace for new users
    const workspace = await prisma.workspace.create({
      data: {
        name: `${user.name}'s Workspace`,
        description: 'Default personal workspace',
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    });

    // Create default project and board
    const project = await prisma.project.create({
      data: {
        name: 'Default Project',
        description: 'Get started by creating your first task board',
        workspaceId: workspace.id,
      },
    });

    const board = await prisma.board.create({
      data: {
        name: 'Main Board',
        description: 'Kanban Task Board',
        projectId: project.id,
      },
    });

    // Create default Kanban columns
    await prisma.column.createMany({
      data: [
        { name: 'TODO', position: 0, boardId: board.id },
        { name: 'IN PROGRESS', position: 1, boardId: board.id },
        { name: 'DONE', position: 2, boardId: board.id },
      ],
    });

    const token = generateToken({ userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
        defaultWorkspaceId: workspace.id,
        defaultProjectId: project.id,
        defaultBoardId: board.id,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const isValidPassword = await comparePassword(data.password, user.password);

    if (!isValidPassword) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        memberships: {
          include: {
            workspace: {
              select: { id: true, name: true, description: true, ownerId: true },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User profile not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}
