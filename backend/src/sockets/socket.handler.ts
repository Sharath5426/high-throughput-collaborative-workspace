import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

let ioInstance: SocketIOServer | null = null;

// Transient presence tracking per board: Map<boardId, Map<userId, PresenceUser>>
const boardPresence = new Map<string, Map<string, { userId: string; name: string; email: string; avatarUrl?: string | null }>>();

export function initializeSocketIO(io: SocketIOServer): void {
  ioInstance = io;

  // Socket authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required for WebSocket connection'));
    }

    try {
      const decoded = verifyToken(token);
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token for WebSocket connection'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`🔌 Socket connected: ${socket.id} (User: ${user?.email || 'Unknown'})`);

    // Join user's personal private room for notifications
    if (user?.userId) {
      socket.join(`user:${user.userId}`);
    }

    // Join board room & register presence
    socket.on('join:board', (data: { boardId: string; userProfile?: { name: string; email: string; avatarUrl?: string | null } }) => {
      const boardId = typeof data === 'string' ? data : data?.boardId;
      if (!boardId) return;

      const room = `board:${boardId}`;
      socket.join(room);
      (socket as any).currentBoardId = boardId;

      if (user?.userId) {
        if (!boardPresence.has(boardId)) {
          boardPresence.set(boardId, new Map());
        }
        const activeMap = boardPresence.get(boardId)!;
        activeMap.set(user.userId, {
          userId: user.userId,
          name: data?.userProfile?.name || user.email.split('@')[0],
          email: user.email,
          avatarUrl: data?.userProfile?.avatarUrl || null,
        });

        // Broadcast active presence update to room
        io.to(room).emit('presence:update', {
          boardId,
          users: Array.from(activeMap.values()),
        });
      }
    });

    // Leave board room
    socket.on('leave:board', (boardId: string) => {
      const room = `board:${boardId}`;
      socket.leave(room);

      if (user?.userId && boardPresence.has(boardId)) {
        const activeMap = boardPresence.get(boardId)!;
        activeMap.delete(user.userId);
        io.to(room).emit('presence:update', {
          boardId,
          users: Array.from(activeMap.values()),
        });
      }
    });

    // Typing / Active Editing Indicators
    socket.on('presence:typing', (payload: { boardId: string; taskId: string; isTyping: boolean; userName?: string }) => {
      const { boardId, taskId, isTyping, userName } = payload;
      if (!boardId || !taskId) return;

      const room = `board:${boardId}`;
      socket.to(room).emit('task:typing', {
        userId: user?.userId,
        userName: userName || user?.email?.split('@')[0] || 'A collaborator',
        taskId,
        isTyping,
      });
    });

    socket.on('canvas:cursor', (payload: { boardId: string; x: number; y: number; userName?: string }) => {
      if (!payload?.boardId) return;
      socket.to(`board:${payload.boardId}`).emit('canvas:cursor', {
        userId: user?.userId,
        userName: payload.userName || user?.email?.split('@')[0] || 'Collaborator',
        x: payload.x,
        y: payload.y,
      });
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      const boardId = (socket as any).currentBoardId;
      if (boardId && user?.userId && boardPresence.has(boardId)) {
        const activeMap = boardPresence.get(boardId)!;
        activeMap.delete(user.userId);
        io.to(`board:${boardId}`).emit('presence:update', {
          boardId,
          users: Array.from(activeMap.values()),
        });
      }
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

export function emitBoardEvent(boardId: string, eventName: string, data: any): void {
  if (ioInstance) {
    const room = `board:${boardId}`;
    ioInstance.to(room).emit(eventName, data);
  }
}

export function emitUserEvent(userId: string, eventName: string, data: any): void {
  if (ioInstance) {
    const room = `user:${userId}`;
    ioInstance.to(room).emit(eventName, data);
  }
}
