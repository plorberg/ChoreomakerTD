'use client';

import type { RemoteCursor } from '@/hooks/useCollab';

/**
 * Renders remote cursors as small arrow + name-label, using screen-space
 * coordinates that Stage2D computes from the remote's (stage-space) x/y.
 */
export function RemoteCursors({
  cursors,
  toScreen,
}: {
  cursors: Record<string, RemoteCursor>;
  toScreen: (x: number, y: number) => { x: number; y: number };
}) {
  const list = Object.values(cursors);
  if (list.length === 0) return null;
  return (
    <g pointerEvents="none">
      {list.map((c) => {
        const p = toScreen(c.x, c.y);
        return (
          <g key={c.clientId} transform={`translate(${p.x}, ${p.y})`}>
            {/* Small arrow pointer, same as macOS default */}
            <path
              d="M0,0 L0,14 L4,10 L7,16 L9,15 L6,9 L11,9 Z"
              fill={c.color}
              stroke="#0008"
              strokeWidth={0.5}
            />
            {/* Name badge */}
            <g transform="translate(13, 16)">
              <rect
                x={0}
                y={0}
                width={Math.max(40, c.displayName.length * 6 + 10)}
                height={16}
                rx={3}
                fill={c.color}
              />
              <text
                x={5}
                y={11}
                fontSize={10}
                fontWeight={600}
                fill="#fff"
                style={{ textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}
              >
                {c.displayName}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}
