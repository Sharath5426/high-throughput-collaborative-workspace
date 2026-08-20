import { create } from 'zustand';
import { Workspace, Project } from '../types';
import { api } from '../services/api';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeProject: Project | null;
  isLoading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (workspace: Workspace) => void;
  setActiveProject: (project: Project) => void;
  createWorkspace: (data: { name: string; description?: string }) => Promise<Workspace>;
  createProject: (data: { name: string; description?: string; workspaceId: string }) => Promise<Project>;
  addMember: (workspaceId: string, email: string, role?: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  activeProject: null,
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/workspaces');
      const workspaces: Workspace[] = res.data.data;
      
      let active = get().activeWorkspace;
      if (!active && workspaces.length > 0) {
        active = workspaces[0];
      } else if (active) {
        active = workspaces.find((w) => w.id === active?.id) || workspaces[0] || null;
      }

      let activeProj = get().activeProject;
      if (active && active.projects && active.projects.length > 0) {
        if (!activeProj || !active.projects.some((p) => p.id === activeProj?.id)) {
          activeProj = active.projects[0];
        }
      }

      set({
        workspaces,
        activeWorkspace: active,
        activeProject: activeProj,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Failed to load workspaces', isLoading: false });
    }
  },

  setActiveWorkspace: (workspace) => {
    const firstProj = workspace.projects && workspace.projects.length > 0 ? workspace.projects[0] : null;
    set({ activeWorkspace: workspace, activeProject: firstProj });
  },

  setActiveProject: (project) => {
    set({ activeProject: project });
  },

  createWorkspace: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/workspaces', payload);
      const newWs: Workspace = res.data.data;
      await get().fetchWorkspaces();
      set({ activeWorkspace: newWs });
      return newWs;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to create workspace';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  createProject: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/projects', payload);
      const newProj: Project = res.data.data;
      await get().fetchWorkspaces();
      set({ activeProject: newProj });
      return newProj;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to create project';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  addMember: async (workspaceId, email, role = 'MEMBER') => {
    try {
      await api.post(`/workspaces/${workspaceId}/members`, { email, role });
      await get().fetchWorkspaces();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to add workspace member';
      throw new Error(msg);
    }
  },
}));
