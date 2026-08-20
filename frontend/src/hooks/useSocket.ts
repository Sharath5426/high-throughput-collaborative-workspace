import { useEffect } from 'react';
import { connectSocket } from '../services/socket';
import { useBoardStore } from '../store/boardStore';
import { useAuthStore } from '../store/authStore';

export function useSocket(boardId?: string) {
  const token = useAuthStore((state) => state.token);
  const { handleTaskCreated, handleTaskUpdated, handleTaskMoved, handleTaskDeleted } = useBoardStore();

  useEffect(() => {
    if (!boardId || !token) return;

    const socket = connectSocket(token);

    // Join room for this specific board
    socket.emit('join:board', boardId);

    // Event listeners
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:moved', handleTaskMoved);
    socket.on('task:deleted', handleTaskDeleted);

    return () => {
      socket.emit('leave:board', boardId);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:moved', handleTaskMoved);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, [boardId, token, handleTaskCreated, handleTaskUpdated, handleTaskMoved, handleTaskDeleted]);
}
