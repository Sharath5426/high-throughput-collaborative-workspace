import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

let ioInstance: SocketIOServer | null = null;

export function initializeSocketIO(io: SocketIOServer): void {
  ioInstance = io;

  // Socket authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
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

    // Join board room
    socket.on('join:board', (boardId: string) => {
      const room = `board:${boardId}`;
      socket.join(room);
      console.log(`👤 User ${user?.userId} joined board room: ${room}`);
    });

    // Leave board room
    socket.on('leave:board', (boardId: string) => {
      const room = `board:${boardId}`;
      socket.leave(room);
      console.log(`👤 User ${user?.userId} left board room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

export function emitBoardEvent(boardId: string, eventName: string, data: any): void {
  if (ioInstance) {
    const room = `board:${boardId}`;
    ioInstance.to(room).emit(eventName, data);
    console.log(`📡 Emitted '${eventName}' to room '${room}'`);
  }
}
