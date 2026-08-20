import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
  description: z.string().optional(),
});

export const addMemberSchema = z.object({
  email: z.string().email('Invalid member email address'),
  role: z.enum(['ADMIN', 'MEMBER']).optional().default('MEMBER'),
});

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  workspaceId: z.string().uuid('Valid workspace ID required'),
});

export const createBoardSchema = z.object({
  name: z.string().min(2, 'Board name must be at least 2 characters'),
  description: z.string().optional(),
  projectId: z.string().uuid('Valid project ID required'),
});

export const createColumnSchema = z.object({
  name: z.string().min(1, 'Column name is required'),
  boardId: z.string().uuid('Valid board ID required'),
  position: z.number().int().nonnegative().optional(),
});

export const updateColumnSchema = z.object({
  name: z.string().min(1).optional(),
  position: z.number().int().nonnegative().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  columnId: z.string().uuid('Valid column ID required'),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.string().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export const moveTaskSchema = z.object({
  columnId: z.string().uuid('Valid destination column ID required'),
  position: z.number().int().nonnegative(),
});
