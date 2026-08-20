import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { User, Shield } from 'lucide-react';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemberModal({ isOpen, onClose }: MemberModalProps) {
  const { activeWorkspace, addMember } = useWorkspaceStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const members = activeWorkspace?.members || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !activeWorkspace) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await addMember(activeWorkspace.id, email, role);
      setSuccess(`Successfully added ${email} to workspace`);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to add workspace member');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Workspace Members">
      <div className="space-y-6">
        {/* Add Member Form */}
        <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Invite Team Member</h3>

          {error && <div className="p-2.5 text-xs rounded bg-red-950/50 border border-red-800 text-red-300">{error}</div>}
          {success && <div className="p-2.5 text-xs rounded bg-emerald-950/50 border border-emerald-800 text-emerald-300">{success}</div>}

          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
              required
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg shadow-md transition"
          >
            {isLoading ? 'Adding Member...' : 'Add Member'}
          </button>
        </form>

        {/* Existing Member List */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Active Members ({members.length})
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs">
                    {m.user.name.substring(0, 1)}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-200 truncate">{m.user.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{m.user.email}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  <Shield className="w-3 h-3 text-blue-400" />
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
