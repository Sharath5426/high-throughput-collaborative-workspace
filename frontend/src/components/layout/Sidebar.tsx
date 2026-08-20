import React from 'react';
import { WorkspaceSelector } from './WorkspaceSelector';
import { ProjectSelector } from './ProjectSelector';
import { LayoutDashboard, Users, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  onOpenCreateWorkspace: () => void;
  onOpenCreateProject: () => void;
  onOpenAddMember: () => void;
}

export function Sidebar({ onOpenCreateWorkspace, onOpenCreateProject, onOpenAddMember }: SidebarProps) {
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-600/30">
          W
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-100 leading-tight">Collaborative</h1>
          <p className="text-xs text-blue-400 font-medium">Workspace Dashboard</p>
        </div>
      </div>

      {/* Workspace Switcher */}
      <div className="p-3 border-b border-slate-800/60">
        <WorkspaceSelector onOpenCreateWorkspace={onOpenCreateWorkspace} />
      </div>

      {/* Main Navigation & Project List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <ProjectSelector onOpenCreateProject={onOpenCreateProject} />

        <div className="pt-2 border-t border-slate-800/60 space-y-1">
          <button
            onClick={onOpenAddMember}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <Users className="w-4 h-4" />
            <span>Workspace Members</span>
          </button>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
