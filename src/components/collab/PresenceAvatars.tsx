'use client';

import type { CollabUser } from '@/hooks/useCollab';

/**
 * Shows up to 4 avatar circles in the toolbar, each colored with the user's
 * assigned color and showing their initials. Overflow is a "+N" pill.
 * Hover shows the email.
 */
export function PresenceAvatars({ peers }: { peers: CollabUser[] }) {
  if (peers.length === 0) return null;
  const visible = peers.slice(0, 4);
  const overflow = peers.length - visible.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((p) => (
        <div
          key={p.clientId}
          title={`${p.displayName} (${p.email})`}
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-panel"
          style={{ backgroundColor: p.color }}
        >
          {initials(p.displayName)}
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-6 h-6 rounded-full bg-bg ring-2 ring-panel flex items-center justify-center text-[10px] font-bold text-white/80">
          +{overflow}
        </div>
      )}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
