import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useBoardStore } from '../../store/boardStore';
import { Plus, Radio, LayoutGrid } from 'lucide-react';

interface HeaderProps {
  onOpenCreateTask: () => void;
  onOpenCreateBoard: () => void;
}

export function Header({ onOpenCreateTask, onOpenCreateBoard }: HeaderProps) {
  const { activeWorkspace, activeProject } = useWorkspaceStore();
  const { board } = useBoardStore();

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
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
        {/* Socket Live Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Real-time Sync Active</span>
        </div>

        {board && (
          <button
            onClick={onOpenCreateTask}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-blue-600/30 transition active:scale-95"
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
