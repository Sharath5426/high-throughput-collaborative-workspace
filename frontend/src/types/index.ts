export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type Role = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  role: Role;
  userId: string;
  workspaceId: string;
  user: User;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  members: WorkspaceMember[];
  projects: Project[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  workspaceId: string;
  boards: Board[];
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string | null;
  projectId: string;
  columns: Column[];
  project?: {
    id: string;
    name: string;
    workspaceId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  name: string;
  position: number;
  boardId: string;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: Priority;
  status: string;
  position: number;
  dueDate?: string | null;
  assigneeId?: string | null;
  columnId: string;
  assignee?: User | null;
  createdAt: string;
  updatedAt: string;
}
