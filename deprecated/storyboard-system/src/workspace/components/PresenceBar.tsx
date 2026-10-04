import React from 'react';
import { usePresence } from '../store';

export function PresenceBar() {
  const users = usePresence();

  if (!users || users.length === 0) return null;

  return (
    <div className="ff73-presence-bar flex items-center gap-1.5 px-2 py-1 bg-surface-container-low rounded-full border border-outline-variant/30 text-xs">
      <div className="flex -space-x-1.5 overflow-hidden">
        {users.map(u => (
          <div
            key={u.userId}
            title={`${u.displayName} (${u.presenceState})`}
            className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white ring-2 ring-surface shrink-0"
            style={{ backgroundColor: u.color || '#3B82F6' }}
          >
            {u.displayName.slice(0, 1).toUpperCase()}
          </div>
        ))}
      </div>
      <span className="text-[11px] text-on-surface-variant font-medium ml-1">
        {users.length} {users.length === 1 ? 'online' : 'collaborating'}
      </span>
    </div>
  );
}
