import { create } from 'zustand';
import { Board, Task, Priority, PendingOperation, ToastNotification, PresenceUser, ConflictPayload } from '../types';
import { api } from '../services/api';
import { loadOfflineQueue, saveOfflineQueue } from '../utils/offlineQueue';

interface BoardState {
  board: Board | null;
  isLoading: boolean;
  error: string | null;

  // Phase 2A Optimistic & Offline Sync State
  pendingOperations: PendingOperation[];
  isOffline: boolean;
  syncStatus: 'idle' | 'syncing' | 'offline' | 'error';
  toasts: ToastNotification[];

  // Phase 2B Collaboration, Presence & OCC State
  activeUsers: PresenceUser[];
  typingUsers: Record<string, { userId: string; userName: string }>; // taskId -> typing user info
  conflictPayload: ConflictPayload | null;
  isConflictModalOpen: boolean;

  // Core Board Actions
  fetchBoard: (boardId: string) => Promise<void>;
  createBoard: (projectId: string, name: string) => Promise<Board>;
  createColumn: (boardId: string, name: string) => Promise<void>;

  // Optimistic Task Operations with OCC
  createTask: (data: { title: string; description?: string; priority?: Priority; columnId: string; assigneeId?: string; dueDate?: string }) => Promise<void>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  moveTask: (taskId: string, destinationColumnId: string, newPosition: number) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Conflict Resolution Action
  resolveConflict: (resolvedTaskPayload: Partial<Task> & { id: string; version: number }) => Promise<void>;
  closeConflictModal: () => void;

  // Presence & Typing Actions
  setActiveUsers: (users: PresenceUser[]) => void;
  setTaskTyping: (taskId: string, userId: string, userName: string, isTyping: boolean) => void;

  // Background Sync & Offline Queue Handlers
  setOfflineState: (isOffline: boolean) => void;
  processOfflineQueue: () => Promise<void>;
  addToast: (message: string, type?: ToastNotification['type']) => void;
  removeToast: (id: string) => void;

  // Real-time Socket.IO Handlers with Reconciliation
  handleTaskCreated: (payload: { task: Task; boardId: string; idempotencyKey?: string }) => void;
  handleTaskUpdated: (payload: { task: Task; boardId: string; idempotencyKey?: string }) => void;
  handleTaskMoved: (payload: { taskId: string; sourceColumnId: string; destinationColumnId: string; newPosition: number; task: Task; boardId: string; idempotencyKey?: string }) => void;
  handleTaskDeleted: (payload: { taskId: string; columnId: string; boardId: string; idempotencyKey?: string }) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,
  isLoading: false,
  error: null,

  pendingOperations: typeof window !== 'undefined' ? loadOfflineQueue() : [],
  isOffline: false,
  syncStatus: 'idle',
  toasts: [],

  activeUsers: [],
  typingUsers: {},
  conflictPayload: null,
  isConflictModalOpen: false,

  setActiveUsers: (users) => set({ activeUsers: users }),

  setTaskTyping: (taskId, userId, userName, isTyping) => {
    set((state) => {
      const next = { ...state.typingUsers };
      if (isTyping) {
        next[taskId] = { userId, userName };
      } else {
        delete next[taskId];
      }
      return { typingUsers: next };
    });
  },

  closeConflictModal: () => set({ isConflictModalOpen: false, conflictPayload: null }),

  setOfflineState: (isOffline) => {
    set({
      isOffline,
      syncStatus: isOffline ? 'offline' : get().pendingOperations.length > 0 ? 'syncing' : 'idle',
    });
    if (!isOffline && get().pendingOperations.length > 0) {
      get().processOfflineQueue();
    }
  },

  addToast: (message, type = 'info') => {
    const toast: ToastNotification = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      message,
      timestamp: Date.now(),
    };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    setTimeout(() => {
      get().removeToast(toast.id);
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

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

  // 1. Optimistic Task Creation
  createTask: async (payload) => {
    const currentBoard = get().board;
    if (!currentBoard) return;

    const tempId = `temp_task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    const targetColumn = currentBoard.columns.find((c) => c.id === payload.columnId);

    const tempTask: Task = {
      id: tempId,
      title: payload.title,
      description: payload.description || '',
      priority: payload.priority || 'MEDIUM',
      status: targetColumn ? targetColumn.name : 'TODO',
      position: targetColumn ? targetColumn.tasks.length : 0,
      version: 1,
      dueDate: payload.dueDate || null,
      assigneeId: payload.assigneeId || null,
      columnId: payload.columnId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedColumns = currentBoard.columns.map((col) => {
      if (col.id === payload.columnId) {
        return { ...col, tasks: [...col.tasks, tempTask] };
      }
      return col;
    });

    const operation: PendingOperation = {
      operationId: `op_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      idempotencyKey,
      type: 'CREATE_TASK',
      entityId: tempId,
      previousState: null,
      optimisticState: tempTask,
      createdAt: new Date().toISOString(),
      status: get().isOffline ? 'PENDING' : 'SYNCING',
      retryCount: 0,
      payload,
    };

    const newPendingOps = [...get().pendingOperations, operation];
    saveOfflineQueue(newPendingOps);

    set({
      board: { ...currentBoard, columns: updatedColumns },
      pendingOperations: newPendingOps,
      syncStatus: get().isOffline ? 'offline' : 'syncing',
    });

    if (get().isOffline) {
      get().addToast('Offline mode: Task queued for background sync', 'warning');
      return;
    }

    try {
      const res = await api.post('/tasks', payload, {
        headers: { 'x-idempotency-key': idempotencyKey },
      });
      const createdTask: Task = res.data.data;

      const finalColumns = get().board?.columns.map((col) => {
        if (col.id === payload.columnId) {
          const tasks = col.tasks.map((t) => (t.id === tempId ? createdTask : t));
          return { ...col, tasks };
        }
        return col;
      }) || updatedColumns;

      const remainingOps = get().pendingOperations.filter((op) => op.operationId !== operation.operationId);
      saveOfflineQueue(remainingOps);

      set({
        board: { ...currentBoard, columns: finalColumns },
        pendingOperations: remainingOps,
        syncStatus: remainingOps.length > 0 ? 'syncing' : 'idle',
      });
    } catch (err: any) {
      if (!navigator.onLine || err.message === 'Network Error') {
        get().addToast('Network lost: Task queued for auto-resync', 'warning');
        set({ isOffline: true, syncStatus: 'offline' });
      } else {
        const rolledBackColumns = currentBoard.columns.map((col) => {
          if (col.id === payload.columnId) {
            return { ...col, tasks: col.tasks.filter((t) => t.id !== tempId) };
          }
          return col;
        });
        const remainingOps = get().pendingOperations.filter((op) => op.operationId !== operation.operationId);
        saveOfflineQueue(remainingOps);

        set({
          board: { ...currentBoard, columns: rolledBackColumns },
          pendingOperations: remainingOps,
          syncStatus: remainingOps.length > 0 ? 'syncing' : 'error',
        });
        get().addToast(`Failed to create task: ${err.response?.data?.error || err.message}`, 'error');
      }
    }
  },

  // 2. Optimistic Task Update with OCC 409 Conflict Handling
  updateTask: async (taskId, payload) => {
    const currentBoard = get().board;
    if (!currentBoard) return;

    let previousTask: Task | null = null;

    currentBoard.columns.forEach((col) => {
      const found = col.tasks.find((t) => t.id === taskId);
      if (found) {
        previousTask = { ...found };
      }
    });

    if (!previousTask) return;
    const prevTask: Task = previousTask;

    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    const optimisticTask: Task = {
      ...prevTask,
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    // Optimistically update local board state
    const updatedColumns = currentBoard.columns.map((col) => {
      const tasks = col.tasks.map((t) => (t.id === taskId ? optimisticTask : t));
      return { ...col, tasks };
    });

    const operation: PendingOperation = {
      operationId: `op_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      idempotencyKey,
      type: 'UPDATE_TASK',
      entityId: taskId,
      previousState: prevTask,
      optimisticState: optimisticTask,
      createdAt: new Date().toISOString(),
      status: get().isOffline ? 'PENDING' : 'SYNCING',
      retryCount: 0,
      payload: { ...payload, version: prevTask.version },
    };

    const newPendingOps = [...get().pendingOperations, operation];
    saveOfflineQueue(newPendingOps);

    set({
      board: { ...currentBoard, columns: updatedColumns },
      pendingOperations: newPendingOps,
      syncStatus: get().isOffline ? 'offline' : 'syncing',
    });

    if (get().isOffline) {
      get().addToast('Offline mode: Task update queued for background sync', 'warning');
      return;
    }

    try {
      const res = await api.put(
        `/tasks/${taskId}`,
        { ...payload, version: prevTask.version },
        { headers: { 'x-idempotency-key': idempotencyKey } }
      );
      const confirmedTask: Task = res.data.data;

      const finalColumns = get().board?.columns.map((col) => {
        const tasks = col.tasks.map((t) => (t.id === taskId ? confirmedTask : t));
        return { ...col, tasks };
      }) || updatedColumns;

      const remainingOps = get().pendingOperations.filter((op) => op.operationId !== operation.operationId);
      saveOfflineQueue(remainingOps);

      set({
        board: { ...currentBoard, columns: finalColumns },
        pendingOperations: remainingOps,
        syncStatus: remainingOps.length > 0 ? 'syncing' : 'idle',
      });
    } catch (err: any) {
      if (err.response?.status === 409) {
        // HTTP 409 Conflict Detected! Open Conflict Resolution Modal
        console.log('⚠️ OCC Conflict detected! Opening ConflictResolutionModal...');
        const serverTask: Task = err.response.data.serverTask;
        const clientTask = err.response.data.clientTask;

        // Rollback local state to server version
        const serverColumns = currentBoard.columns.map((col) => {
          const tasks = col.tasks.map((t) => (t.id === taskId ? serverTask : t));
          return { ...col, tasks };
        });

        const remainingOps = get().pendingOperations.filter((op) => op.operationId !== operation.operationId);
        saveOfflineQueue(remainingOps);

        set({
          board: { ...currentBoard, columns: serverColumns },
          pendingOperations: remainingOps,
          conflictPayload: { serverTask, clientTask },
          isConflictModalOpen: true,
          syncStatus: 'idle',
        });
        get().addToast('Conflict detected! Someone else updated this task.', 'warning');
      } else if (!navigator.onLine || err.message === 'Network Error') {
        get().addToast('Network error: Update saved locally and will resync', 'warning');
        set({ isOffline: true, syncStatus: 'offline' });
      } else {
        const rolledBackColumns = currentBoard.columns.map((col) => {
          const tasks = col.tasks.map((t) => (t.id === taskId ? prevTask : t));
          return { ...col, tasks };
        });
        const remainingOps = get().pendingOperations.filter((op) => op.operationId !== operation.operationId);
        saveOfflineQueue(remainingOps);

        set({
          board: { ...currentBoard, columns: rolledBackColumns },
          pendingOperations: remainingOps,
          syncStatus: remainingOps.length > 0 ? 'syncing' : 'error',
        });
        get().addToast(`Task update rejected: ${err.response?.data?.error || err.message}`, 'error');
      }
    }
  },

  // Resolve OCC Conflict with merged values
  resolveConflict: async (resolvedTaskPayload) => {
    const { id: taskId, version: currentServerVersion, ...data } = resolvedTaskPayload;
    try {
      const res = await api.put(`/tasks/${taskId}`, {
        ...data,
        version: currentServerVersion,
      });
      const updatedTask: Task = res.data.data;
      const currentBoard = get().board;

      if (currentBoard) {
        const columns = currentBoard.columns.map((col) => {
          const tasks = col.tasks.map((t) => (t.id === taskId ? updatedTask : t));
          return { ...col, tasks };
        });
        set({ board: { ...currentBoard, columns } });
      }

      get().closeConflictModal();
      get().addToast('Conflict resolved & task updated successfully!', 'success');
    } catch (err: any) {
      get().addToast(`Failed to resolve conflict: ${err.response?.data?.error || err.message}`, 'error');
    }
  },

  // 3. Optimistic Task Movement (Drag-and-Drop)
  moveTask: async (taskId, destinationColumnId, newPosition) => {
    const currentBoard = get().board;
    if (!currentBoard) return;

    let originalTask: Task | null = null;
    let sourceColumnId = '';
    let originalPosition = 0;

    currentBoard.columns.forEach((col) => {
      const idx = col.tasks.findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        originalTask = col.tasks[idx];
        sourceColumnId = col.id;
        originalPosition = idx;
      }
    });

    if (!originalTask) return;
    const origTask: Task = originalTask;

    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    const destinationColumn = currentBoard.columns.find((c) => c.id === destinationColumnId);

    const optimisticTask: Task = {
      ...origTask,
      columnId: destinationColumnId,
      position: newPosition,
      status: destinationColumn ? destinationColumn.name : origTask.status,
    };

    const columns = currentBoard.columns.map((col) => {
      const filteredTasks = col.tasks.filter((t) => t.id !== taskId);
      return { ...col, tasks: filteredTasks };
    });

    const targetCol = columns.find((c) => c.id === destinationColumnId);
    if (targetCol) {
      targetCol.tasks.splice(newPosition, 0, optimisticTask);
    }

    const operation: PendingOperation = {
      operationId: `op_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      idempotencyKey,
      type: 'MOVE_TASK',
      entityId: taskId,
      previousState: { sourceColumnId, originalPosition, task: origTask },
      optimisticState: { destinationColumnId, newPosition, task: optimisticTask },
      createdAt: new Date().toISOString(),
      status: get().isOffline ? 'PENDING' : 'SYNCING',
      retryCount: 0,
      payload: { columnId: destinationColumnId, position: newPosition, version: origTask.version },
    };

    const newPendingOps = [...get().pendingOperations, operation];
    saveOfflineQueue(newPendingOps);

    set({
      board: { ...currentBoard, columns },
      pendingOperations: newPendingOps,
      syncStatus: get().isOffline ? 'offline' : 'syncing',
    });

    if (get().isOffline) {
      get().addToast('Offline mode: Task movement queued for sync', 'warning');
      return;
    }

    try {
      const res = await api.put(
        `/tasks/${taskId}/move`,
        { columnId: destinationColumnId, position: newPosition, version: origTask.version },
        { headers: { 'x-idempotency-key': idempotencyKey } }
      );
      const confirmedTask: Task = res.data.data;

      const finalColumns = get().board?.columns.map((col) => {
        const tasks = col.tasks.map((t) => (t.id === taskId ? confirmedTask : t));
        return { ...col, tasks };
      }) || columns;

      const remainingOps = get().pendingOperations.filter((op) => op.operationId !== operation.operationId);
      saveOfflineQueue(remainingOps);

      set({
        board: { ...currentBoard, columns: finalColumns },
        pendingOperations: remainingOps,
        syncStatus: remainingOps.length > 0 ? 'syncing' : 'idle',
      });
    } catch (err: any) {
      if (err.response?.status === 409) {
        const serverTask: Task = err.response.data.serverTask;
        get().addToast('Task move conflict: Reverted to server state.', 'warning');
        if (currentBoard) {
          get().fetchBoard(currentBoard.id);
        }
      } else if (!navigator.onLine || err.message === 'Network Error') {
        get().addToast('Network error: Task move queued for resync', 'warning');
        set({ isOffline: true, syncStatus: 'offline' });
      } else {
        const rollbackColumns = currentBoard.columns;
        const remainingOps = get().pendingOperations.filter((op) => op.operationId !== operation.operationId);
        saveOfflineQueue(remainingOps);

        set({
          board: { ...currentBoard, columns: rollbackColumns },
          pendingOperations: remainingOps,
          syncStatus: remainingOps.length > 0 ? 'syncing' : 'error',
        });
        get().addToast('Task move failed: Position reverted', 'error');
      }
    }
  },

  // 4. Optimistic Task Deletion
  deleteTask: async (taskId) => {
    const currentBoard = get().board;
    if (!currentBoard) return;

    let deletedTask: Task | null = null;
    let targetColumnId = '';
    let originalIndex = 0;

    currentBoard.columns.forEach((col) => {
      const idx = col.tasks.findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        deletedTask = col.tasks[idx];
        targetColumnId = col.id;
        originalIndex = idx;
      }
    });

    if (!deletedTask) return;

    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;

    const columns = currentBoard.columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => t.id !== taskId),
    }));

    const operation: PendingOperation = {
      operationId: `op_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      idempotencyKey,
      type: 'DELETE_TASK',
      entityId: taskId,
      previousState: { columnId: targetColumnId, index: originalIndex, task: deletedTask },
      optimisticState: null,
      createdAt: new Date().toISOString(),
      status: get().isOffline ? 'PENDING' : 'SYNCING',
      retryCount: 0,
      payload: { taskId },
    };

    const newPendingOps = [...get().pendingOperations, operation];
    saveOfflineQueue(newPendingOps);

    set({
      board: { ...currentBoard, columns },
      pendingOperations: newPendingOps,
      syncStatus: get().isOffline ? 'offline' : 'syncing',
    });

    if (get().isOffline) {
      get().addToast('Offline mode: Deletion queued for sync', 'warning');
      return;
    }

    try {
      await api.delete(`/tasks/${taskId}`, {
        headers: { 'x-idempotency-key': idempotencyKey },
      });
      const remainingOps = get().pendingOperations.filter((op) => op.operationId !== operation.operationId);
      saveOfflineQueue(remainingOps);

      set({
        pendingOperations: remainingOps,
        syncStatus: remainingOps.length > 0 ? 'syncing' : 'idle',
      });
    } catch (err: any) {
      if (!navigator.onLine || err.message === 'Network Error') {
        get().addToast('Network error: Deletion queued for resync', 'warning');
        set({ isOffline: true, syncStatus: 'offline' });
      } else {
        const rollbackColumns = currentBoard.columns.map((col) => {
          if (col.id === targetColumnId && deletedTask) {
            const restoredTasks = [...col.tasks];
            restoredTasks.splice(originalIndex, 0, deletedTask);
            return { ...col, tasks: restoredTasks };
          }
          return col;
        });

        const remainingOps = get().pendingOperations.filter((op) => op.operationId !== operation.operationId);
        saveOfflineQueue(remainingOps);

        set({
          board: { ...currentBoard, columns: rollbackColumns },
          pendingOperations: remainingOps,
          syncStatus: remainingOps.length > 0 ? 'syncing' : 'error',
        });
        get().addToast('Failed to delete task. Restored.', 'error');
      }
    }
  },

  // Background Data Synchronization Queue Processor
  processOfflineQueue: async () => {
    const queue = get().pendingOperations;
    if (queue.length === 0) return;

    set({ syncStatus: 'syncing' });
    get().addToast(`Syncing ${queue.length} pending operation(s)...`, 'info');

    const updatedQueue: PendingOperation[] = [];

    for (const op of queue) {
      try {
        if (op.type === 'CREATE_TASK') {
          const res = await api.post('/tasks', op.payload, {
            headers: { 'x-idempotency-key': op.idempotencyKey },
          });
          const createdTask: Task = res.data.data;
          const currentBoard = get().board;
          if (currentBoard) {
            const columns = currentBoard.columns.map((col) => {
              if (col.id === op.payload.columnId) {
                const tasks = col.tasks.map((t) => (t.id === op.entityId ? createdTask : t));
                return { ...col, tasks };
              }
              return col;
            });
            set({ board: { ...currentBoard, columns } });
          }
        } else if (op.type === 'UPDATE_TASK') {
          await api.put(`/tasks/${op.entityId}`, op.payload, {
            headers: { 'x-idempotency-key': op.idempotencyKey },
          });
        } else if (op.type === 'MOVE_TASK') {
          await api.put(`/tasks/${op.entityId}/move`, op.payload, {
            headers: { 'x-idempotency-key': op.idempotencyKey },
          });
        } else if (op.type === 'DELETE_TASK') {
          await api.delete(`/tasks/${op.entityId}`, {
            headers: { 'x-idempotency-key': op.idempotencyKey },
          });
        }
      } catch (err: any) {
        if (!navigator.onLine || err.message === 'Network Error') {
          updatedQueue.push({ ...op, status: 'PENDING', retryCount: op.retryCount + 1 });
        } else if (op.retryCount < 3) {
          updatedQueue.push({ ...op, status: 'FAILED', retryCount: op.retryCount + 1 });
        } else {
          get().addToast(`Operation ${op.type} failed permanently and was discarded.`, 'error');
        }
      }
    }

    saveOfflineQueue(updatedQueue);
    set({
      pendingOperations: updatedQueue,
      syncStatus: updatedQueue.length > 0 ? 'offline' : 'idle',
    });

    if (updatedQueue.length === 0) {
      get().addToast('All offline changes synchronized successfully!', 'success');
      const board = get().board;
      if (board) get().fetchBoard(board.id);
    }
  },

  // Socket.IO Real-time Reconciliations
  handleTaskCreated: ({ task, boardId, idempotencyKey }) => {
    const currentBoard = get().board;
    if (!currentBoard || currentBoard.id !== boardId) return;

    const isLocalOp = idempotencyKey && get().pendingOperations.some((op) => op.idempotencyKey === idempotencyKey);
    if (isLocalOp) return;

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

  handleTaskUpdated: ({ task, boardId, idempotencyKey }) => {
    const currentBoard = get().board;
    if (!currentBoard || currentBoard.id !== boardId) return;

    const isLocalOp = idempotencyKey && get().pendingOperations.some((op) => op.idempotencyKey === idempotencyKey);
    if (isLocalOp) return;

    const columns = currentBoard.columns.map((col) => {
      const tasks = col.tasks.map((t) => (t.id === task.id ? task : t));
      return { ...col, tasks };
    });

    set({ board: { ...currentBoard, columns } });
  },

  handleTaskMoved: ({ taskId, destinationColumnId, newPosition, task, boardId, idempotencyKey }) => {
    const currentBoard = get().board;
    if (!currentBoard || currentBoard.id !== boardId) return;

    const isLocalOp = idempotencyKey && get().pendingOperations.some((op) => op.idempotencyKey === idempotencyKey);
    if (isLocalOp) return;

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

  handleTaskDeleted: ({ taskId, boardId, idempotencyKey }) => {
    const currentBoard = get().board;
    if (!currentBoard || currentBoard.id !== boardId) return;

    const isLocalOp = idempotencyKey && get().pendingOperations.some((op) => op.idempotencyKey === idempotencyKey);
    if (isLocalOp) return;

    const columns = currentBoard.columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => t.id !== taskId),
    }));

    set({ board: { ...currentBoard, columns } });
  },
}));
