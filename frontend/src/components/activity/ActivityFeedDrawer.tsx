import React from 'react';
import { useActivityStore } from '../../store/activityStore';
import { X, Activity, User, Clock } from 'lucide-react';

export function ActivityFeedDrawer() {
  const { activities, isActivityFeedOpen, toggleActivityFeed, isLoading } = useActivityStore();

  if (!isActivityFeedOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
          <Activity className="w-4 h-4 text-blue-400" />
          <span>Real-Time Activity Feed</span>
        </div>
        <button
          onClick={toggleActivityFeed}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Activity Item List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && activities.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">Loading activity stream...</div>
        ) : activities.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">No activity logged yet.</div>
        ) : (
          activities.map((act) => {
            const timeAgo = new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={act.id}
                className="p-3 rounded-xl bg-slate-800/50 border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold text-slate-200">{act.user?.name || act.user?.email}</span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo}
                  </span>
                </div>

                <div className="text-xs text-slate-300 font-medium">
                  {act.action === 'TASK_CREATED' && (
                    <span>Created task <strong className="text-blue-400">"{act.details?.title}"</strong></span>
                  )}
                  {act.action === 'TASK_UPDATED' && (
                    <span>Updated task <strong className="text-blue-400">"{act.details?.title}"</strong></span>
                  )}
                  {act.action === 'TASK_MOVED' && (
                    <span>
                      Moved task <strong className="text-blue-400">"{act.details?.title}"</strong> to {act.details?.to}
                    </span>
                  )}
                  {act.action === 'TASK_DELETED' && (
                    <span>Deleted task <strong className="text-rose-400">"{act.details?.title}"</strong></span>
                  )}
                  {!['TASK_CREATED', 'TASK_UPDATED', 'TASK_MOVED', 'TASK_DELETED'].includes(act.action) && (
                    <span>Action: {act.action}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
