import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task } from '../../types';
import { Clock, User as UserIcon, Trash2, Edit3 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  index: number;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  MEDIUM: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  HIGH: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  URGENT: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
};

export function TaskCard({ task, index, onEditTask, onDeleteTask }: TaskCardProps) {
  const priorityStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.MEDIUM;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group relative p-4 mb-3 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-blue-500/40 transition-all duration-200 shadow-md ${
            snapshot.isDragging ? 'ring-2 ring-blue-500 shadow-2xl scale-[1.02] z-50 bg-slate-850' : ''
          }`}
        >
          {/* Priority Pill & Quick Actions */}
          <div className="flex items-center justify-between mb-2">
            <span
              className={`px-2.5 py-0.5 text-[11px] font-semibold tracking-wider rounded-full border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
            >
              {task.priority}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTask(task);
                }}
                className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800"
                title="Edit Task"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTask(task.id);
                }}
                className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"
                title="Delete Task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Task Title */}
          <h4 className="text-sm font-semibold text-slate-100 mb-1 line-clamp-2 leading-snug">
            {task.title}
          </h4>

          {/* Description preview */}
          {task.description && (
            <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Task Footer metadata */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/50 text-xs text-slate-400 mt-2">
            {/* Due date */}
            {task.dueDate ? (
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            ) : (
              <div />
            )}

            {/* Assignee Avatar */}
            {task.assignee ? (
              <div
                className="flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700/60"
                title={task.assignee.name}
              >
                <div className="w-4 h-4 rounded-full bg-blue-600 text-[9px] font-bold text-white flex items-center justify-center">
                  {task.assignee.name.substring(0, 1)}
                </div>
                <span className="text-[11px] text-slate-300 font-medium truncate max-w-[80px]">
                  {task.assignee.name.split(' ')[0]}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-slate-500 italic">
                <UserIcon className="w-3 h-3" />
                <span>Unassigned</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
