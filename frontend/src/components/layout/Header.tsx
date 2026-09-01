import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useBoardStore } from '../../store/boardStore';
import { useActivityStore } from '../../store/activityStore';
import { PresenceAvatars } from '../presence/PresenceAvatars';
import { Plus, Radio, LayoutGrid, RefreshCw, WifiOff, Activity, Bell } from 'lucide-react';

interface HeaderProps {
  onOpenCreateTask: () => void;
  onOpenCreateBoard: () => void;
}

export function Header({ onOpenCreateTask, onOpenCreateBoard }: HeaderProps) {
  const { activeWorkspace, activeProject } = useWorkspaceStore();
  const { board, pendingOperations, isOffline, processOfflineQueue } = useBoardStore();
  const { toggleActivityFeed, toggleNotifications, unreadCount } = useActivityStore();

  const pendingCount = pendingOperations.length;

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between shrink-0 z-30">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-800 text-blue-400">
          <LayoutGrid className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">{activeWorkspace?.name || 'Workspace'}</span>
            <span className="text-xs text-slate-600">/</span>
            <span className="text-xs font-semibold text-blue-400">{activeProject?.name || 'Project'}</span>
          </div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            {board ? board.name : 'Kanban Board'}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Phase 2B Multi-User Presence Avatars */}
        <PresenceAvatars />

        {/* Phase 2A Background Sync & Offline Status Badges */}
        {isOffline ? (
          <div
            onClick={processOfflineQueue}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium cursor-pointer hover:bg-amber-500/20 transition"
            title="Click to retry sync when network is restored"
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline ({pendingCount} queued)</span>
          </div>
        ) : pendingCount > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Syncing {pendingCount} change(s)...</span>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Real-time Sync Active</span>
          </div>
        )}

        {/* Phase 2B Activity Feed Drawer Toggle */}
        <button
          onClick={toggleActivityFeed}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition"
          title="Activity Log Stream"
        >
          <Activity className="w-4 h-4 text-blue-400" />
        </button>

        {/* Phase 2B Notification Drawer Toggle with Badge */}
        <button
          onClick={toggleNotifications}
          className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-amber-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {board && (
          <button
            onClick={onOpenCreateTask}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-blue-600/30 transition active:scale-95 ml-1"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        )}

        {activeProject && !board && (
          <button
            onClick={onOpenCreateBoard}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-lg border border-slate-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Board</span>
          </button>
        )}
      </div>
    </header>
  );
}
