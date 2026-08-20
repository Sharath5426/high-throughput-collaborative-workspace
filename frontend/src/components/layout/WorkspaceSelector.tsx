import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ChevronDown, Plus, Building2 } from 'lucide-react';

interface WorkspaceSelectorProps {
  onOpenCreateWorkspace: () => void;
}

export function WorkspaceSelector({ onOpenCreateWorkspace }: WorkspaceSelectorProps) {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspaceStore();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm">
            {activeWorkspace ? activeWorkspace.name.substring(0, 2).toUpperCase() : 'WS'}
          </div>
          <div className="text-left truncate">
            <p className="text-sm font-semibold text-slate-100 truncate">
              {activeWorkspace ? activeWorkspace.name : 'Select Workspace'}
            </p>
            <p className="text-xs text-slate-500">
              {activeWorkspace?.members?.length || 1} Member(s)
            </p>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full z-40 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-1.5 animate-in fade-in zoom-in-95">
          <p className="px-2.5 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Workspaces
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  setActiveWorkspace(ws);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition ${
                  activeWorkspace?.id === ws.id
                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span className="truncate">{ws.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-1 pt-1 border-t border-slate-800">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenCreateWorkspace();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-blue-400 hover:bg-blue-950/40 transition font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Create Workspace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
