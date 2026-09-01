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
  version: number;
  dueDate?: string | null;
  assigneeId?: string | null;
  columnId: string;
  assignee?: User | null;
  createdAt: string;
  updatedAt: string;
}

export type OperationType = 'CREATE_TASK' | 'UPDATE_TASK' | 'MOVE_TASK' | 'DELETE_TASK';
export type OperationStatus = 'PENDING' | 'SYNCING' | 'FAILED';

export interface PendingOperation {
  operationId: string;
  idempotencyKey: string;
  type: OperationType;
  entityId: string;
  previousState: any;
  optimisticState: any;
  createdAt: string;
  status: OperationStatus;
  retryCount: number;
  payload: any;
}

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

// Phase 2B Multi-User Collaboration & Presence Types
export interface PresenceUser {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  taskId: string;
  isTyping: boolean;
}

export interface ActivityLog {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  boardId?: string | null;
  userId: string;
  action: string;
  details?: any;
  createdAt: string;
  user: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
}

export interface CanvasElement {
  id: string;
  boardId: string;
  workspaceId: string;
  createdBy: string;
  type: 'sticky' | 'shape' | 'text' | 'draw';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string | null;
  style?: Record<string, any> | null;
  points?: number[] | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  creator?: User | null;
}

export interface ConflictPayload {
  serverTask: Task;
  clientTask: Partial<Task> & { id: string };
}
