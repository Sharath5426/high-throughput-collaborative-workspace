import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useBoardStore } from '../../store/boardStore';

interface BoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BoardModal({ isOpen, onClose }: BoardModalProps) {
  const { activeProject } = useWorkspaceStore();
  const { createBoard } = useBoardStore();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeProject) return;

    setIsLoading(true);
    setError('');

    try {
      await createBoard(activeProject.id, name);
      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create board');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Kanban Board">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 text-xs rounded bg-red-950/50 border border-red-800 text-red-300">{error}</div>}

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Board Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sprint 24 Execution Board"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md transition"
          >
            {isLoading ? 'Creating...' : 'Create Board'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
