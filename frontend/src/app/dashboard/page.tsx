'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useBoardStore } from '../../store/boardStore';
import { useActivityStore } from '../../store/activityStore';
import { useSocket } from '../../hooks/useSocket';
import { useOfflineSync } from '../../hooks/useOfflineSync';

import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { KanbanBoard } from '../../components/kanban/KanbanBoard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { ToastContainer } from '../../components/ui/Toast';
import { ActivityFeedDrawer } from '../../components/activity/ActivityFeedDrawer';
import { NotificationDrawer } from '../../components/notifications/NotificationDrawer';
import { ConflictResolutionModal } from '../../components/modals/ConflictResolutionModal';

import { TaskModal } from '../../components/modals/TaskModal';
import { WorkspaceModal } from '../../components/modals/WorkspaceModal';
import { ProjectModal } from '../../components/modals/ProjectModal';
import { BoardModal } from '../../components/modals/BoardModal';
import { MemberModal } from '../../components/modals/MemberModal';
import { CollaborationCanvas } from '../../components/canvas/CollaborationCanvas';

import { Task } from '../../types';
import { LayoutGrid, Plus, FolderKanban, Building2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();

  const { isAuthenticated, fetchProfile } = useAuthStore();
  const {
    fetchWorkspaces,
    activeWorkspace,
    activeProject,
    isLoading: isWsLoading,
  } = useWorkspaceStore();
  const {
    board,
    fetchBoard,
    createTask,
    updateTask,
    deleteTask,
    createColumn,
    isLoading: isBoardLoading,
  } = useBoardStore();

  const { fetchActivities, fetchNotifications } = useActivityStore();

  // Active board ID
  const activeBoardId = board?.id || (activeProject?.boards && activeProject.boards.length > 0 ? activeProject.boards[0].id : undefined);

  // Phase 2A/2B Hooks
  useOfflineSync();
  useSocket(activeBoardId);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | undefined>(undefined);

  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  // Load Auth Profile & Workspaces on Mount
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    fetchProfile();
    fetchWorkspaces();
    fetchNotifications();
  }, [isAuthenticated, router, fetchProfile, fetchWorkspaces, fetchNotifications]);

  // Load Board & Workspace Activities when active workspace/project changes
  useEffect(() => {
    if (activeWorkspace) {
      fetchActivities(activeWorkspace.id);
    }
    if (activeProject && activeProject.boards && activeProject.boards.length > 0) {
      fetchBoard(activeProject.boards[0].id);
    }
  }, [activeWorkspace, activeProject, fetchBoard, fetchActivities]);

  const handleOpenCreateTask = (columnId?: string) => {
    setEditingTask(null);
    setSelectedColumnId(columnId || (board?.columns[0]?.id));
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (payload: any) => {
    if (editingTask) {
      await updateTask(editingTask.id, payload);
    } else {
      await createTask(payload);
    }
  };

  const handleAddColumn = async () => {
    if (!board) return;
    const columnName = prompt('Enter new column name:');
    if (columnName && columnName.trim()) {
      await createColumn(board.id, columnName.trim());
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        onOpenCreateWorkspace={() => setIsWorkspaceModalOpen(true)}
        onOpenCreateProject={() => setIsProjectModalOpen(true)}
        onOpenAddMember={() => setIsMemberModalOpen(true)}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          onOpenCreateTask={() => handleOpenCreateTask()}
          onOpenCreateBoard={() => setIsBoardModalOpen(true)}
        />

        {/* Dashboard Canvas Area */}
        <main className="flex-1 overflow-hidden relative bg-slate-900/40">
          {isWsLoading || isBoardLoading ? (
            <div className="h-full flex items-center justify-center gap-3">
              <Spinner className="w-8 h-8 text-blue-500" />
              <span className="text-sm font-medium text-slate-400">Loading workspace dashboard...</span>
            </div>
          ) : !activeWorkspace ? (
            <div className="h-full flex items-center justify-center p-6">
              <EmptyState
                icon={<Building2 className="w-12 h-12" />}
                title="No Workspaces Available"
                description="Create your first workspace to start collaborating on projects."
                action={
                  <button
                    onClick={() => setIsWorkspaceModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-600/30 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Workspace</span>
                  </button>
                }
              />
            </div>
          ) : !activeProject ? (
            <div className="h-full flex items-center justify-center p-6">
              <EmptyState
                icon={<FolderKanban className="w-12 h-12" />}
                title="No Projects in Workspace"
                description={`Workspace "${activeWorkspace.name}" has no active projects.`}
                action={
                  <button
                    onClick={() => setIsProjectModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-600/30 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Project</span>
                  </button>
                }
              />
            </div>
          ) : !board ? (
            <div className="h-full flex items-center justify-center p-6">
              <EmptyState
                icon={<LayoutGrid className="w-12 h-12" />}
                title="No Kanban Boards"
                description={`Project "${activeProject.name}" has no task board.`}
                action={
                  <button
                    onClick={() => setIsBoardModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-600/30 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Board</span>
                  </button>
                }
              />
            </div>
          ) : (
            <div className="flex h-full flex-col lg:flex-row">
              <div className="flex-1 min-w-0">
                <KanbanBoard
                  onAddTask={(colId) => handleOpenCreateTask(colId)}
                  onEditTask={handleOpenEditTask}
                  onDeleteTask={(taskId) => deleteTask(taskId)}
                  onAddColumn={handleAddColumn}
                />
              </div>
              <div className="w-full lg:w-[440px] border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950/40">
                <CollaborationCanvas />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Phase 2B Drawers & Modals */}
      <ActivityFeedDrawer />
      <NotificationDrawer />
      <ConflictResolutionModal />

      {/* Core Phase 1 Modals & Toasts */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        initialTask={editingTask}
        defaultColumnId={selectedColumnId}
      />
      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
      />
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
      <BoardModal
        isOpen={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
      />
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
      />
      <ToastContainer />
    </div>
  );
}
