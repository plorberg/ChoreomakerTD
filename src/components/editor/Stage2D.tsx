'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useInterpolatedFrame } from '@/hooks/useInterpolatedFrame';

const PX_PER_METER = 40;

type Point = { x: number; y: number };

export function Stage2D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    performerId: string;
    pointerId: number;
  } | null>(null);

  const [size, setSize] = useState({ w: 800, h: 600 });

  const choreo = useEditorStore((s) => s.choreo);
  const selected = useEditorStore((s) => s.selectedPerformerIds);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const movePerformer = useEditorStore((s) => s.movePerformer);
  const selectPerformer = useEditorStore((s) => s.selectPerformer);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  const { states } = useInterpolatedFrame();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      setSize({
        w: el.clientWidth || 800,
        h: el.clientHeight || 600,
      });
    };

    updateSize();

    const ro = new ResizeObserver(() => updateSize());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  if (!choreo) return null;

  const stageWpx = choreo.stage.width * PX_PER_METER;
  const stageHpx = choreo.stage.height * PX_PER_METER;
  const offsetX = (size.w - stageWpx) / 2;
  const offsetY = (size.h - stageHpx) / 2;

  const toScreen = (x: number, y: number): Point => ({
    x: offsetX + (x + choreo.stage.width / 2) * PX_PER_METER,
    y: offsetY + (y + choreo.stage.height / 2) * PX_PER_METER,
  });

  const fromScreen = (sx: number, sy: number): Point => ({
    x: (sx - offsetX) / PX_PER_METER - choreo.stage.width / 2,
    y: (sy - offsetY) / PX_PER_METER - choreo.stage.height / 2,
  });

  const performers = useMemo(() => {
    return choreo.performers
      .map((p) => {
        const st = states[p.id];
        if (!st) return null;
        const screen = toScreen(st.position.x, st.position.y);
        return {
          performer: p,
          x: screen.x,
          y: screen.y,
          isSelected: selected.includes(p.id),
        };
      })
      .filter(Boolean) as Array<{
      performer: (typeof choreo.performers)[number];
      x: number;
      y: number;
      isSelected: boolean;
    }>;
  }, [choreo.performers, selected, states, offsetX, offsetY, choreo.stage.width, choreo.stage.height]);

  const handleBackgroundPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  };

  const handleTokenPointerDown = (
    e: React.PointerEvent<SVGGElement>,
    performerId: string
  ) => {
    e.stopPropagation();
    selectPerformer(performerId, e.shiftKey);

    if (isPlaying) return;

    dragRef.current = {
      performerId,
      pointerId: e.pointerId,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleTokenPointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!dragRef.current || isPlaying) return;
    if (dragRef.current.pointerId !== e.pointerId) return;

    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const pos = fromScreen(sx, sy);
    movePerformer(dragRef.current.performerId, pos);
  };

  const handleTokenPointerUp = (e: React.PointerEvent<SVGGElement>) => {
    if (!dragRef.current) return;
    if (dragRef.current.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    dragRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="editor-surface absolute inset-0 bg-bg touch-none select-none"
    >
      <svg
        width={size.w}
        height={size.h}
        className="block h-full w-full"
        onPointerDown={handleBackgroundPointerDown}
      >
        <g>
          <rect
            x={offsetX}
            y={offsetY}
            width={stageWpx}
            height={stageHpx}
            fill={choreo.stage.backgroundColor ?? '#1a1d24'}
            stroke="#3a4150"
            strokeWidth={2}
            rx={8}
          />
          <rect
            x={offsetX + stageWpx / 2 - 0.5}
            y={offsetY}
            width={1}
            height={stageHpx}
            fill="#2b3140"
          />
          <rect
            x={offsetX}
            y={offsetY + stageHpx / 2 - 0.5}
            width={stageWpx}
            height={1}
            fill="#2b3140"
          />
          <text
            x={offsetX + stageWpx / 2}
            y={offsetY - 10}
            textAnchor="middle"
            fontSize="10"
            fill="#5a6270"
          >
            UPSTAGE
          </text>
          <text
            x={offsetX + stageWpx / 2}
            y={offsetY + stageHpx + 16}
            textAnchor="middle"
            fontSize="10"
            fill="#5a6270"
          >
            DOWNSTAGE (audience)
          </text>
        </g>

        <g>
          {performers.map(({ performer, x, y, isSelected }) => (
            <g
              key={performer.id}
              transform={`translate(${x}, ${y})`}
              onPointerDown={(e) => handleTokenPointerDown(e, performer.id)}
              onPointerMove={handleTokenPointerMove}
              onPointerUp={handleTokenPointerUp}
              onPointerCancel={handleTokenPointerUp}
              style={{ cursor: isPlaying ? 'pointer' : 'grab' }}
            >
              <circle
                r={20}
                fill={performer.color}
                stroke={isSelected ? '#ffffff' : 'rgba(0,0,0,0.4)'}
                strokeWidth={isSelected ? 3 : 1}
              />
              {isSelected && (
                <circle
                  r={24}
                  fill="none"
                  stroke={performer.color}
                  strokeWidth={2}
                  opacity={0.45}
                />
              )}
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#ffffff"
                pointerEvents="none"
              >
                {performer.initials ?? ''}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}