import { useEffect } from 'react';
import { connectSocket } from '../services/socket';
import { useBoardStore } from '../store/boardStore';
import { useAuthStore } from '../store/authStore';
import { useActivityStore } from '../store/activityStore';
import { useCanvasStore } from '../store/canvasStore';
import { PresenceUser, ActivityLog, Notification, CanvasElement } from '../types';

export function useSocket(boardId?: string) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const {
    fetchBoard,
    handleTaskCreated,
    handleTaskUpdated,
    handleTaskMoved,
    handleTaskDeleted,
    processOfflineQueue,
    setActiveUsers,
    setTaskTyping,
    addToast,
  } = useBoardStore();

  const { handleNewActivity, handleNewNotification } = useActivityStore();
  const { handleCanvasElementCreated, handleCanvasElementUpdated, handleCanvasElementDeleted } = useCanvasStore();

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    // If viewing a specific board, join board room and register presence
    if (boardId) {
      socket.emit('join:board', {
        boardId,
        userProfile: user ? { name: user.name, email: user.email, avatarUrl: user.avatarUrl } : undefined,
      });
    }

    const handleReconnect = () => {
      console.log(`🔌 Socket reconnected.`);
      if (boardId) {
        socket.emit('join:board', {
          boardId,
          userProfile: user ? { name: user.name, email: user.email, avatarUrl: user.avatarUrl } : undefined,
        });
        fetchBoard(boardId);
      }
      processOfflineQueue();
    };

    const handlePresenceUpdate = (payload: { boardId: string; users: PresenceUser[] }) => {
      if (payload.boardId === boardId) {
        setActiveUsers(payload.users);
      }
    };

    const handleTaskTyping = (payload: { userId: string; userName: string; taskId: string; isTyping: boolean }) => {
      setTaskTyping(payload.taskId, payload.userId, payload.userName, payload.isTyping);
    };

    const handleIncomingActivity = (activity: ActivityLog) => {
      handleNewActivity(activity);
    };

    const handleIncomingNotification = (notification: Notification) => {
      handleNewNotification(notification);
      addToast(`🔔 ${notification.title}: ${notification.message}`, 'info');
    };

    socket.on('reconnect', handleReconnect);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('task:typing', handleTaskTyping);
    socket.on('activity:new', handleIncomingActivity);
    socket.on('notification:new', handleIncomingNotification);

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:moved', handleTaskMoved);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('canvas:element:created', handleCanvasElementCreated);
    socket.on('canvas:element:updated', handleCanvasElementUpdated);
    socket.on('canvas:element:deleted', handleCanvasElementDeleted);

    return () => {
      if (boardId) {
        socket.emit('leave:board', boardId);
      }
      socket.off('reconnect', handleReconnect);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('task:typing', handleTaskTyping);
      socket.off('activity:new', handleIncomingActivity);
      socket.off('notification:new', handleIncomingNotification);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:moved', handleTaskMoved);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('canvas:element:created', handleCanvasElementCreated);
      socket.off('canvas:element:updated', handleCanvasElementUpdated);
      socket.off('canvas:element:deleted', handleCanvasElementDeleted);
    };
  }, [
    boardId,
    token,
    user,
    fetchBoard,
    handleTaskCreated,
    handleTaskUpdated,
    handleTaskMoved,
    handleTaskDeleted,
    processOfflineQueue,
    setActiveUsers,
    setTaskTyping,
    handleNewActivity,
    handleNewNotification,
    handleCanvasElementCreated,
    handleCanvasElementUpdated,
    handleCanvasElementDeleted,
    addToast,
  ]);
}
