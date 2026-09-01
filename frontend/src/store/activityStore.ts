import { create } from 'zustand';
import { ActivityLog, Notification } from '../types';
import { api } from '../services/api';

interface ActivityState {
  activities: ActivityLog[];
  notifications: Notification[];
  unreadCount: number;
  isActivityFeedOpen: boolean;
  isNotificationOpen: boolean;
  isLoading: boolean;

  toggleActivityFeed: () => void;
  toggleNotifications: () => void;
  fetchActivities: (workspaceId: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;

  handleNewActivity: (activity: ActivityLog) => void;
  handleNewNotification: (notification: Notification) => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  notifications: [],
  unreadCount: 0,
  isActivityFeedOpen: false,
  isNotificationOpen: false,
  isLoading: false,

  toggleActivityFeed: () => {
    set((state) => ({
      isActivityFeedOpen: !state.isActivityFeedOpen,
      isNotificationOpen: false,
    }));
  },

  toggleNotifications: () => {
    set((state) => ({
      isNotificationOpen: !state.isNotificationOpen,
      isActivityFeedOpen: false,
    }));
  },

  fetchActivities: async (workspaceId) => {
    if (!workspaceId) return;
    set({ isLoading: true });
    try {
      const res = await api.get(`/activity?workspaceId=${workspaceId}`);
      set({ activities: res.data.data, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  fetchNotifications: async () => {
    try {
      const res = await api.get('/notifications');
      const { notifications, unreadCount } = res.data.data;
      set({ notifications, unreadCount });
    } catch (err) {
      // Ignore
    }
  },

  markAsRead: async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      // Ignore
    }
  },

  markAllAsRead: async () => {
    try {
      await api.put('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      // Ignore
    }
  },

  handleNewActivity: (activity) => {
    set((state) => {
      const exists = state.activities.some((a) => a.id === activity.id);
      if (exists) return state;
      return { activities: [activity, ...state.activities] };
    });
  },

  handleNewNotification: (notification) => {
    set((state) => {
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) return state;
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    });
  },
}));
