import React from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useBoardStore } from '../../store/boardStore';
import { KanbanColumn } from './KanbanColumn';
import { Task } from '../../types';
import { Plus } from 'lucide-react';

interface KanbanBoardProps {
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddColumn: () => void;
}

export function KanbanBoard({ onAddTask, onEditTask, onDeleteTask, onAddColumn }: KanbanBoardProps) {
  const { board, moveTask } = useBoardStore();

  if (!board) return null;

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    moveTask(draggableId, destination.droppableId, destination.index);
  };

  const columns = board.columns || [];

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex items-start gap-5 overflow-x-auto p-6 h-full pb-8">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            onAddTask={onAddTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        ))}

        {/* Add New Column Button */}
        <button
          onClick={onAddColumn}
          className="w-80 h-32 bg-slate-950/40 hover:bg-slate-900 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition shrink-0 font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Column</span>
        </button>
      </div>
    </DragDropContext>
  );
}
