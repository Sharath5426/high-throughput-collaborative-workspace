import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Column, Task } from '../../types';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  column: Column;
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export function KanbanColumn({ column, onAddTask, onEditTask, onDeleteTask }: KanbanColumnProps) {
  const tasks = column.tasks || [];

  return (
    <div className="w-80 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex flex-col max-h-full shrink-0 shadow-lg">
      {/* Column Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-bold text-slate-100 tracking-wide uppercase">{column.name}</h3>
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700/50">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          title="Add Task to Column"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Droppable Task Container */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-3 flex-1 overflow-y-auto min-h-[150px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-blue-950/20' : ''
            }`}
          >
            {tasks.length === 0 ? (
              <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/80 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 font-medium">No tasks here yet</p>
                <button
                  onClick={() => onAddTask(column.id)}
                  className="mt-2 text-xs text-blue-400 hover:underline font-medium"
                >
                  + Add task
                </button>
              </div>
            ) : (
              tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
