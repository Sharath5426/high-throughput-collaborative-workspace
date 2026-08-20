import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (!socket) {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : '');
    socket = io(SOCKET_URL, {
      auth: { token: authToken },
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(token?: string): Socket {
  const s = getSocket(token);
  if (!s.connected) {
    s.auth = { token: token || (typeof window !== 'undefined' ? localStorage.getItem('token') : '') };
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
