import { create } from 'zustand';
import { Board, Task, Priority } from '../types';
import { api } from '../services/api';

interface BoardState {
  board: Board | null;
  isLoading: boolean;
  error: string | null;
  fetchBoard: (boardId: string) => Promise<void>;
  createBoard: (projectId: string, name: string) => Promise<Board>;
  createColumn: (boardId: string, name: string) => Promise<void>;
  createTask: (data: { title: string; description?: string; priority?: Priority; columnId: string; assigneeId?: string; dueDate?: string }) => Promise<void>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  moveTask: (taskId: string, destinationColumnId: string, newPosition: number) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  
  // Real-time WebSocket handlers
  handleTaskCreated: (payload: { task: Task; boardId: string }) => void;
  handleTaskUpdated: (payload: { task: Task; boardId: string }) => void;
  handleTaskMoved: (payload: { taskId: string; sourceColumnId: string; destinationColumnId: string; newPosition: number; task: Task; boardId: string }) => void;
  handleTaskDeleted: (payload: { taskId: string; columnId: string; boardId: string }) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,
  isLoading: false,
  error: null,

  fetchBoard: async (boardId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`/boards/${boardId}`);
      set({ board: res.data.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to load board', isLoading: false });
    }
  },

  createBoard: async (projectId, name) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/boards', { projectId, name });
      const newBoard = res.data.data;
      set({ board: newBoard, isLoading: false });
      return newBoard;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to create board';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  createColumn: async (boardId, name) => {
    try {
      await api.post('/columns', { boardId, name });
      await get().fetchBoard(boardId);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to create column');
    }
  },

  createTask: async (payload) => {
    try {
      const res = await api.post('/tasks', payload);
      const newTask: Task = res.data.data;
      const board = get().board;
      if (board) {
        get().handleTaskCreated({ task: newTask, boardId: board.id });
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to create task');
    }
  },

  updateTask: async (taskId, payload) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, payload);
      const updatedTask: Task = res.data.data;
      const board = get().board;
      if (board) {
        get().handleTaskUpdated({ task: updatedTask, boardId: board.id });
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to update task');
    }
  },

  moveTask: async (taskId, destinationColumnId, newPosition) => {
    const currentBoard = get().board;
    if (!currentBoard) return;

    // Perform optimistic local state update for instant smooth UX
    const columns = currentBoard.columns.map((col) => {
      // Find source column and remove task
      const updatedTasks = col.tasks.filter((t) => t.id !== taskId);
      return { ...col, tasks: updatedTasks };
    });

    let movedTask: Task | null = null;
    currentBoard.columns.forEach((col) => {
      const found = col.tasks.find((t) => t.id === taskId);
      if (found) movedTask = { ...found, columnId: destinationColumnId, position: newPosition };
    });

    if (movedTask) {
      const targetCol = columns.find((c) => c.id === destinationColumnId);
      if (targetCol) {
        targetCol.tasks.splice(newPosition, 0, movedTask);
      }
      set({ board: { ...currentBoard, columns } });
    }

    try {
      await api.put(`/tasks/${taskId}/move`, {
        columnId: destinationColumnId,
        position: newPosition,
      });
    } catch (err) {
      // Revert on error
      if (currentBoard) {
        get().fetchBoard(currentBoard.id);
      }
    }
  },

  deleteTask: async (taskId) => {
    const board = get().board;
    try {
      await api.delete(`/tasks/${taskId}`);
      if (board) {
        const col = board.columns.find((c) => c.tasks.some((t) => t.id === taskId));
        if (col) {
          get().handleTaskDeleted({ taskId, columnId: col.id, boardId: board.id });
        }
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to delete task');
    }
  },

  // Socket Event Handlers
  handleTaskCreated: ({ task, boardId }) => {
    const currentBoard = get().board;
    if (!currentBoard || currentBoard.id !== boardId) return;

    const columns = currentBoard.columns.map((col) => {
      if (col.id === task.columnId) {
        const exists = col.tasks.some((t) => t.id === task.id);
        if (!exists) {
          return { ...col, tasks: [...col.tasks, task] };
        }
      }
      return col;
    });

    set({ board: { ...currentBoard, columns } });
  },

  handleTaskUpdated: ({ task, boardId }) => {
    const currentBoard = get().board;
    if (!currentBoard || currentBoard.id !== boardId) return;

    const columns = currentBoard.columns.map((col) => {
      const tasks = col.tasks.map((t) => (t.id === task.id ? task : t));
      return { ...col, tasks };
    });

    set({ board: { ...currentBoard, columns } });
  },

  handleTaskMoved: ({ taskId, sourceColumnId, destinationColumnId, newPosition, task, boardId }) => {
    const currentBoard = get().board;
    if (!currentBoard || currentBoard.id !== boardId) return;

    let targetTask = task;
    const columns = currentBoard.columns.map((col) => {
      const filtered = col.tasks.filter((t) => {
        if (t.id === taskId) {
          if (!targetTask) targetTask = t;
          return false;
        }
        return true;
      });
      return { ...col, tasks: filtered };
    });

    const destCol = columns.find((c) => c.id === destinationColumnId);
    if (destCol && targetTask) {
      destCol.tasks.splice(newPosition, 0, { ...targetTask, columnId: destinationColumnId, position: newPosition });
    }

    set({ board: { ...currentBoard, columns } });
  },

  handleTaskDeleted: ({ taskId, boardId }) => {
    const currentBoard = get().board;
    if (!currentBoard || currentBoard.id !== boardId) return;

    const columns = currentBoard.columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => t.id !== taskId),
    }));

    set({ board: { ...currentBoard, columns } });
  },
}));
