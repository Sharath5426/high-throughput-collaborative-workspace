'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useBoardStore } from '../../store/boardStore';
import { useSocket } from '../../hooks/useSocket';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { KanbanBoard } from '../../components/kanban/KanbanBoard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';

import { TaskModal } from '../../components/modals/TaskModal';
import { WorkspaceModal } from '../../components/modals/WorkspaceModal';
import { ProjectModal } from '../../components/modals/ProjectModal';
import { BoardModal } from '../../components/modals/BoardModal';
import { MemberModal } from '../../components/modals/MemberModal';

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

  // Active board ID
  const activeBoardId = board?.id || (activeProject?.boards && activeProject.boards.length > 0 ? activeProject.boards[0].id : undefined);

  // Subscribe to real-time Socket.IO events for active board
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
  }, [isAuthenticated, router, fetchProfile, fetchWorkspaces]);

  // Load Board when active project changes
  useEffect(() => {
    if (activeProject && activeProject.boards && activeProject.boards.length > 0) {
      fetchBoard(activeProject.boards[0].id);
    }
  }, [activeProject, fetchBoard]);

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
            <KanbanBoard
              onAddTask={(colId) => handleOpenCreateTask(colId)}
              onEditTask={handleOpenEditTask}
              onDeleteTask={(taskId) => deleteTask(taskId)}
              onAddColumn={handleAddColumn}
            />
          )}
        </main>
      </div>

      {/* Modals */}
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
    </div>
  );
}
