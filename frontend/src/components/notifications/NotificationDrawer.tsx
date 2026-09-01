import React from 'react';
import { useActivityStore } from '../../store/activityStore';
import { Bell, CheckCheck, X, CheckCircle2 } from 'lucide-react';

export function NotificationDrawer() {
  const {
    notifications,
    isNotificationOpen,
    toggleNotifications,
    markAsRead,
    markAllAsRead,
  } = useActivityStore();

  if (!isNotificationOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
          <Bell className="w-4 h-4 text-amber-400" />
          <span>Notifications</span>
        </div>
        <div className="flex items-center gap-2">
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          <button
            onClick={toggleNotifications}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Notification Item List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">No notifications. You are all caught up!</div>
        ) : (
          notifications.map((n) => {
            const timeAgo = new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-3.5 rounded-xl border transition cursor-pointer ${
                  n.isRead
                    ? 'bg-slate-900/50 border-slate-800/60 opacity-75'
                    : 'bg-slate-800/80 border-amber-500/30 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200 mb-1">
                  <span className="flex items-center gap-1.5">
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                    {n.title}
                  </span>
                  <span className="text-[10px] text-slate-500">{timeAgo}</span>
                </div>
                <p className="text-xs text-slate-300 leading-snug">{n.message}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
