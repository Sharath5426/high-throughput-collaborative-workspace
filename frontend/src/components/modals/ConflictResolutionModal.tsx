import React, { useState, useEffect } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { AlertTriangle, Check, RefreshCw, X } from 'lucide-react';
import { Priority } from '../../types';

export function ConflictResolutionModal() {
  const { isConflictModalOpen, conflictPayload, closeConflictModal, resolveConflict } = useBoardStore();

  const [titleChoice, setTitleChoice] = useState<'server' | 'client'>('client');
  const [descChoice, setDescChoice] = useState<'server' | 'client'>('client');
  const [priorityChoice, setPriorityChoice] = useState<'server' | 'client'>('client');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isConflictModalOpen || !conflictPayload) return null;

  const { serverTask, clientTask } = conflictPayload;

  const handleResolve = async () => {
    setIsSubmitting(true);
    try {
      const resolvedTitle = titleChoice === 'server' ? serverTask.title : clientTask.title || serverTask.title;
      const resolvedDesc = descChoice === 'server' ? serverTask.description : clientTask.description ?? serverTask.description;
      const resolvedPriority = priorityChoice === 'server' ? serverTask.priority : clientTask.priority || serverTask.priority;

      await resolveConflict({
        id: serverTask.id,
        version: serverTask.version,
        title: resolvedTitle,
        description: resolvedDesc,
        priority: resolvedPriority as Priority,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Conflict Detected (HTTP 409)</h3>
              <p className="text-xs text-amber-300">
                Another collaborator modified this task while you were editing. Choose which values to keep.
              </p>
            </div>
          </div>
          <button
            onClick={closeConflictModal}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Comparison Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Field 1: Title */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Task Title</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setTitleChoice('server')}
                className={`p-3 rounded-lg border text-left transition ${
                  titleChoice === 'server'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Server Version (v{serverTask.version})</div>
                <div className="text-xs font-medium">{serverTask.title}</div>
              </button>

              <button
                onClick={() => setTitleChoice('client')}
                className={`p-3 rounded-lg border text-left transition ${
                  titleChoice === 'client'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-amber-400 mb-1">Your Attempted Changes</div>
                <div className="text-xs font-medium">{clientTask.title || '(No change)'}</div>
              </button>
            </div>
          </div>

          {/* Field 2: Description */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Description</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setDescChoice('server')}
                className={`p-3 rounded-lg border text-left transition ${
                  descChoice === 'server'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Server Version</div>
                <div className="text-xs font-medium">{serverTask.description || 'No description'}</div>
              </button>

              <button
                onClick={() => setDescChoice('client')}
                className={`p-3 rounded-lg border text-left transition ${
                  descChoice === 'client'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-amber-400 mb-1">Your Attempted Changes</div>
                <div className="text-xs font-medium">{clientTask.description || 'No description'}</div>
              </button>
            </div>
          </div>

          {/* Field 3: Priority */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Priority</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setPriorityChoice('server')}
                className={`p-3 rounded-lg border text-left transition ${
                  priorityChoice === 'server'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Server Version</div>
                <div className="text-xs font-medium">{serverTask.priority}</div>
              </button>

              <button
                onClick={() => setPriorityChoice('client')}
                className={`p-3 rounded-lg border text-left transition ${
                  priorityChoice === 'client'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-amber-400 mb-1">Your Attempted Changes</div>
                <div className="text-xs font-medium">{clientTask.priority || serverTask.priority}</div>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={closeConflictModal}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Resolving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Submit Resolved Task</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
