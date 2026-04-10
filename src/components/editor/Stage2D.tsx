'use client';

import { Stage, Layer, Rect, Circle, Text, Group } from 'react-konva';
import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useInterpolatedFrame } from '@/hooks/useInterpolatedFrame';

const PX_PER_METER = 40;

export function Stage2D() {
  const containerRef = useRef<HTMLDivElement>(null);
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
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!choreo) return null;

  const stageWpx = choreo.stage.width * PX_PER_METER;
  const stageHpx = choreo.stage.height * PX_PER_METER;
  const offsetX = (size.w - stageWpx) / 2;
  const offsetY = (size.h - stageHpx) / 2;

  const toScreen = (x: number, y: number) => ({
    x: offsetX + (x + choreo.stage.width / 2) * PX_PER_METER,
    y: offsetY + (y + choreo.stage.height / 2) * PX_PER_METER,
  });
  const fromScreen = (sx: number, sy: number) => ({
    x: (sx - offsetX) / PX_PER_METER - choreo.stage.width / 2,
    y: (sy - offsetY) / PX_PER_METER - choreo.stage.height / 2,
  });

  return (
    <div ref={containerRef} className="editor-surface absolute inset-0 bg-bg">
      <Stage
        width={size.w}
        height={size.h}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) clearSelection();
        }}
      >
        <Layer listening={false}>
          <Rect
            x={offsetX}
            y={offsetY}
            width={stageWpx}
            height={stageHpx}
            fill={choreo.stage.backgroundColor ?? '#1a1d24'}
            stroke="#3a4150"
            strokeWidth={2}
          />
          <Rect
            x={offsetX + stageWpx / 2 - 0.5}
            y={offsetY}
            width={1}
            height={stageHpx}
            fill="#2b3140"
          />
          <Rect
            x={offsetX}
            y={offsetY + stageHpx / 2 - 0.5}
            width={stageWpx}
            height={1}
            fill="#2b3140"
          />
          <Text
            text="UPSTAGE"
            x={offsetX}
            y={offsetY - 16}
            width={stageWpx}
            align="center"
            fontSize={10}
            fill="#5a6270"
          />
          <Text
            text="DOWNSTAGE (audience)"
            x={offsetX}
            y={offsetY + stageHpx + 4}
            width={stageWpx}
            align="center"
            fontSize={10}
            fill="#5a6270"
          />
        </Layer>
        <Layer>
          {choreo.performers.map((p) => {
            const st = states[p.id];
            if (!st) return null;
            const { x, y } = toScreen(st.position.x, st.position.y);
            const isSel = selected.includes(p.id);
            return (
              <Group
                key={p.id}
                x={x}
                y={y}
                draggable={!isPlaying}
                onDragEnd={(e) => {
                  const pos = fromScreen(e.target.x(), e.target.y());
                  movePerformer(p.id, pos);
                }}
                onClick={(e) => {
                  e.cancelBubble = true;
                  selectPerformer(p.id, e.evt.shiftKey);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  selectPerformer(p.id);
                }}
              >
                <Circle
                  radius={20}
                  fill={p.color}
                  stroke={isSel ? '#ffffff' : 'rgba(0,0,0,0.4)'}
                  strokeWidth={isSel ? 3 : 1}
                  shadowBlur={isSel ? 10 : 0}
                  shadowColor={p.color}
                />
                <Text
                  text={p.initials ?? ''}
                  fontSize={12}
                  fontStyle="bold"
                  fill="#fff"
                  width={40}
                  align="center"
                  offsetX={20}
                  offsetY={6}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
