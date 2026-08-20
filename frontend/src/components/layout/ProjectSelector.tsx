import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { FolderKanban, Plus } from 'lucide-react';

interface ProjectSelectorProps {
  onOpenCreateProject: () => void;
}

export function ProjectSelector({ onOpenCreateProject }: ProjectSelectorProps) {
  const { activeWorkspace, activeProject, setActiveProject } = useWorkspaceStore();

  const projects = activeWorkspace?.projects || [];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Projects
        </span>
        <button
          onClick={onOpenCreateProject}
          className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
          title="Create New Project"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="px-2.5 py-2 text-xs text-slate-500 italic">
          No projects yet. Create one!
        </div>
      ) : (
        projects.map((proj) => (
          <button
            key={proj.id}
            onClick={() => setActiveProject(proj)}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition ${
              activeProject?.id === proj.id
                ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-900/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
            }`}
          >
            <FolderKanban className="w-4 h-4 opacity-80" />
            <span className="truncate">{proj.name}</span>
          </button>
        ))
      )}
    </div>
  );
}
