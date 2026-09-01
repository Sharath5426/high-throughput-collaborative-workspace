import React from 'react';
import { useBoardStore } from '../../store/boardStore';

export function PresenceAvatars() {
  const { activeUsers } = useBoardStore();

  if (!activeUsers || activeUsers.length === 0) return null;

  return (
    <div className="flex items-center -space-x-2 overflow-hidden py-1 px-2 rounded-full bg-slate-800/40 border border-slate-800">
      {activeUsers.slice(0, 5).map((user) => {
        const initials = user.name ? user.name.substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase();

        return (
          <div
            key={user.userId}
            className="relative group cursor-pointer"
            title={`${user.name || user.email} (Active now)`}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
              {initials}
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 px-2 py-1 bg-slate-900 text-slate-200 text-xs rounded border border-slate-800 whitespace-nowrap shadow-xl">
              {user.name || user.email}
            </div>
          </div>
        );
      })}

      {activeUsers.length > 5 && (
        <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-300">
          +{activeUsers.length - 5}
        </div>
      )}
    </div>
  );
}
