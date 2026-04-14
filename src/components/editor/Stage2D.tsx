'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useInterpolatedFrame } from '@/hooks/useInterpolatedFrame';

const TOKEN_R = 20;
const ROTATION_HANDLE_DIST = 36;
const STAGE_PADDING_PX = 60; // room for axis labels around the square
const SNAP_M = 0.5;          // grid snap step in meters; hold Shift to bypass

type Vec2 = { x: number; y: number };

/**
 * Three mutually exclusive interaction modes.
 * Held in a ref so pointer-move callbacks don't trigger React re-renders.
 */
type Interaction =
  | { kind: 'idle' }
  | {
      kind: 'drag-tokens';
      pointerId: number;
      /** The performer the user actually clicked — used as snap anchor. */
      primaryId: string;
      startStage: Vec2;
      origins: Record<string, Vec2>; // performer id → starting position
      lastDelta: Vec2;               // for incremental application
      pendingDelta: Vec2 | null;     // queued for next rAF
    }
  | {
      kind: 'drag-follower';
      pointerId: number;
      performerId: string;
      /** Stage point where the drag started. */
      startStage: Vec2;
      /** Original splitOffset when drag began. */
      originOffset: Vec2;
      lastDelta: Vec2;
      pendingDelta: Vec2 | null;
    }
  | {
      kind: 'rotate-token';
      pointerId: number;
      performerId: string;
      center: Vec2;                  // performer center in stage coords
    }
  | {
      kind: 'marquee';
      pointerId: number;
      startScreen: Vec2;             // pixel coords
      currentScreen: Vec2;
    };

export function Stage2D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const interactionRef = useRef<Interaction>({ kind: 'idle' });
  const rafRef = useRef<number | null>(null);

  // Marquee needs to repaint while dragging — store an integer "tick" we
  // bump from rAF to force a re-render of just this component.
  const [marqueeTick, setMarqueeTick] = useState(0);
  const [size, setSize] = useState({ w: 800, h: 600 });

  const choreo = useEditorStore((s) => s.choreo);
  const selected = useEditorStore((s) => s.selectedPerformerIds);
  const currentFormationId = useEditorStore((s) => s.currentFormationId);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const moveSelectedBy = useEditorStore((s) => s.moveSelectedBy);
  const moveFollowerBy = useEditorStore((s) => s.moveFollowerBy);
  const rotatePerformer = useEditorStore((s) => s.rotatePerformer);
  const selectPerformer = useEditorStore((s) => s.selectPerformer);
  const setSelection = useEditorStore((s) => s.setSelection);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  const { states } = useInterpolatedFrame();

  // ---- Resize observer --------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth || 800, h: el.clientHeight || 600 });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- Cleanup ----------------------------------------------------------
  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  if (!choreo) return null;

  // ---- Geometry ---------------------------------------------------------
  // Stage is always square. Fit it into the container while leaving padding
  // for axis labels.
  const stageMeters = choreo.stage.width;
  const available = Math.max(120, Math.min(size.w, size.h) - STAGE_PADDING_PX * 2);
  const pxPerMeter = available / stageMeters;
  const stagePx = stageMeters * pxPerMeter;
  const offsetX = (size.w - stagePx) / 2;
  const offsetY = (size.h - stagePx) / 2;
  const bg = choreo.stage.backgroundColor ?? '#c89968';

  const screenToStage = (sx: number, sy: number): Vec2 => ({
    x: (sx - offsetX) / pxPerMeter - stageMeters / 2,
    y: (sy - offsetY) / pxPerMeter - stageMeters / 2,
  });

  const stageToScreen = (x: number, y: number): Vec2 => ({
    x: offsetX + (x + stageMeters / 2) * pxPerMeter,
    y: offsetY + (y + stageMeters / 2) * pxPerMeter,
  });

  const getStagePoint = (e: React.PointerEvent): Vec2 => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return screenToStage(e.clientX - rect.left, e.clientY - rect.top);
  };

  const getScreenPoint = (e: React.PointerEvent): Vec2 => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // ---- Render data ------------------------------------------------------
  type Token = {
    key: string;              // unique DOM key
    performer: (typeof choreo.performers)[number];
    role: 'leader' | 'follower' | 'solo';
    x: number;
    y: number;
    stagePos: Vec2;            // absolute stage position
    rotationDeg: number;
    isSelected: boolean;
  };

  const tokens: Token[] = useMemo(() => {
    const list: Token[] = [];
    for (const p of choreo.performers) {
      const st = states[p.id];
      if (!st) continue;
      const isSel = selected.includes(p.id);
      if (st.splitOffset) {
        // Split couple → leader at `position`, follower at position + offset
        const leaderPos = st.position;
        const followerPos = {
          x: st.position.x + st.splitOffset.x,
          y: st.position.y + st.splitOffset.y,
        };
        const ls = stageToScreen(leaderPos.x, leaderPos.y);
        const fs = stageToScreen(followerPos.x, followerPos.y);
        list.push({
          key: `${p.id}:leader`,
          performer: p,
          role: 'leader',
          x: ls.x,
          y: ls.y,
          stagePos: leaderPos,
          rotationDeg: st.rotationDeg,
          isSelected: isSel,
        });
        list.push({
          key: `${p.id}:follower`,
          performer: p,
          role: 'follower',
          x: fs.x,
          y: fs.y,
          stagePos: followerPos,
          rotationDeg: st.rotationDeg,
          isSelected: isSel,
        });
      } else {
        const scr = stageToScreen(st.position.x, st.position.y);
        list.push({
          key: p.id,
          performer: p,
          role: 'solo',
          x: scr.x,
          y: scr.y,
          stagePos: st.position,
          rotationDeg: st.rotationDeg,
          isSelected: isSel,
        });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choreo.performers, selected, states, offsetX, offsetY, pxPerMeter]);

  // ---- rAF flush --------------------------------------------------------
  const flushDrag = () => {
    rafRef.current = null;
    const it = interactionRef.current;
    if (it.kind === 'drag-tokens' && it.pendingDelta) {
      moveSelectedBy(it.pendingDelta);
      it.pendingDelta = null;
    } else if (it.kind === 'drag-follower' && it.pendingDelta) {
      moveFollowerBy(it.performerId, it.pendingDelta);
      it.pendingDelta = null;
    } else if (it.kind === 'marquee') {
      // Force re-render so the marquee rectangle updates
      setMarqueeTick((t) => t + 1);
    }
  };

  const queueRaf = () => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(flushDrag);
  };

  const captureOnRoot = (pointerId: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      svg.setPointerCapture(pointerId);
    } catch {}
  };

  // ---- Background pointer down (start marquee or clear selection) ------
  const handleBackgroundPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.target !== e.currentTarget) return;
    if (isPlaying) return;

    if (!e.shiftKey) clearSelection();

    const screenStart = getScreenPoint(e);
    interactionRef.current = {
      kind: 'marquee',
      pointerId: e.pointerId,
      startScreen: screenStart,
      currentScreen: screenStart,
    };
    captureOnRoot(e.pointerId);
  };

  // ---- Token pointer down ------------------------------------------------
  const handleTokenPointerDown = (
    e: React.PointerEvent<SVGGElement>,
    performerId: string,
  ) => {
    e.stopPropagation();
    if (isPlaying) return;

    const isAlreadySelected = selected.includes(performerId);
    if (e.shiftKey) {
      selectPerformer(performerId, true);
    } else if (!isAlreadySelected) {
      selectPerformer(performerId, false);
    }

    // Snapshot current selection (post-update via store).
    const liveSelection = useEditorStore.getState().selectedPerformerIds;
    const draggedIds = liveSelection.includes(performerId)
      ? liveSelection
      : [performerId];

    const f = choreo.formations.find(
      (x) => x.id === useEditorStore.getState().currentFormationId,
    );
    if (!f) return;

    const origins: Record<string, Vec2> = {};
    for (const id of draggedIds) {
      const st = f.states[id];
      if (st) origins[id] = { ...st.position };
    }

    interactionRef.current = {
      kind: 'drag-tokens',
      pointerId: e.pointerId,
      primaryId: performerId,
      startStage: getStagePoint(e),
      origins,
      lastDelta: { x: 0, y: 0 },
      pendingDelta: null,
    };

    captureOnRoot(e.pointerId);
  };

  // ---- Follower pointer down --------------------------------------------
  const handleFollowerPointerDown = (
    e: React.PointerEvent<SVGGElement>,
    performerId: string,
  ) => {
    e.stopPropagation();
    if (isPlaying) return;

    // Selecting the couple (not creating a separate "follower" selection) —
    // selection stays at the performer level.
    if (!selected.includes(performerId)) {
      selectPerformer(performerId, e.shiftKey);
    }

    const f = choreo.formations.find(
      (x) => x.id === useEditorStore.getState().currentFormationId,
    );
    if (!f) return;
    const st = f.states[performerId];
    if (!st || !st.splitOffset) return;

    interactionRef.current = {
      kind: 'drag-follower',
      pointerId: e.pointerId,
      performerId,
      startStage: getStagePoint(e),
      originOffset: { ...st.splitOffset },
      lastDelta: { x: 0, y: 0 },
      pendingDelta: null,
    };
    captureOnRoot(e.pointerId);
  };

  // ---- Rotation handle pointer down -------------------------------------
  const handleRotationPointerDown = (
    e: React.PointerEvent<SVGCircleElement>,
    performerId: string,
    center: Vec2,
  ) => {
    e.stopPropagation();
    if (isPlaying) return;

    interactionRef.current = {
      kind: 'rotate-token',
      pointerId: e.pointerId,
      performerId,
      center,
    };
    captureOnRoot(e.pointerId);
  };

  // ---- Pointer move (single handler at SVG root) -----------------------
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const it = interactionRef.current;
    if (it.kind === 'idle') return;
    if ('pointerId' in it && it.pointerId !== e.pointerId) return;

    if (it.kind === 'drag-tokens') {
      const current = getStagePoint(e);
      let totalDelta = {
        x: current.x - it.startStage.x,
        y: current.y - it.startStage.y,
      };

      // Snap-to-grid: anchor on the primary performer. Hold Shift to bypass.
      if (!e.shiftKey) {
        const primaryOrigin = it.origins[it.primaryId];
        if (primaryOrigin) {
          const half = stageMeters / 2;
          const targetX = clamp(primaryOrigin.x + totalDelta.x, -half, half);
          const targetY = clamp(primaryOrigin.y + totalDelta.y, -half, half);
          const snappedX = Math.round(targetX / SNAP_M) * SNAP_M;
          const snappedY = Math.round(targetY / SNAP_M) * SNAP_M;
          totalDelta = {
            x: snappedX - primaryOrigin.x,
            y: snappedY - primaryOrigin.y,
          };
        }
      }

      const incremental = {
        x: totalDelta.x - it.lastDelta.x,
        y: totalDelta.y - it.lastDelta.y,
      };
      // Skip no-op moves (saves a store update + render when snapped position
      // hasn't crossed a half-meter boundary).
      if (incremental.x === 0 && incremental.y === 0) return;

      it.lastDelta = totalDelta;
      it.pendingDelta = it.pendingDelta
        ? { x: it.pendingDelta.x + incremental.x, y: it.pendingDelta.y + incremental.y }
        : incremental;
      queueRaf();
    } else if (it.kind === 'drag-follower') {
      const current = getStagePoint(e);
      let totalDelta = {
        x: current.x - it.startStage.x,
        y: current.y - it.startStage.y,
      };

      // Snap: the follower's ABSOLUTE stage position snaps to the grid.
      if (!e.shiftKey) {
        // Origin absolute position = leader pos + origin offset.
        // We only need the origin offset and the current leader pos to
        // compute the follower's absolute origin.
        const f = choreo.formations.find((x) => x.id === useEditorStore.getState().currentFormationId);
        const st = f?.states[it.performerId];
        if (st) {
          const originAbs = {
            x: st.position.x + it.originOffset.x,
            y: st.position.y + it.originOffset.y,
          };
          const half = stageMeters / 2;
          const targetX = clamp(originAbs.x + totalDelta.x, -half, half);
          const targetY = clamp(originAbs.y + totalDelta.y, -half, half);
          const snappedX = Math.round(targetX / SNAP_M) * SNAP_M;
          const snappedY = Math.round(targetY / SNAP_M) * SNAP_M;
          totalDelta = {
            x: snappedX - originAbs.x,
            y: snappedY - originAbs.y,
          };
        }
      }

      const incremental = {
        x: totalDelta.x - it.lastDelta.x,
        y: totalDelta.y - it.lastDelta.y,
      };
      if (incremental.x === 0 && incremental.y === 0) return;
      it.lastDelta = totalDelta;
      it.pendingDelta = it.pendingDelta
        ? { x: it.pendingDelta.x + incremental.x, y: it.pendingDelta.y + incremental.y }
        : incremental;
      queueRaf();
    } else if (it.kind === 'rotate-token') {
      const current = getStagePoint(e);
      // 0° points "up" (–y on stage). atan2 in screen-space.
      const dx = current.x - it.center.x;
      const dy = current.y - it.center.y;
      let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      // Snap to 45° increments unless Shift is held for free rotation
      if (!e.shiftKey) {
        deg = Math.round(deg / 45) * 45;
      }
      rotatePerformer(it.performerId, deg);
    } else if (it.kind === 'marquee') {
      it.currentScreen = getScreenPoint(e);
      queueRaf();
    }
  };

  // ---- Pointer up --------------------------------------------------------
  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const it = interactionRef.current;
    if (it.kind === 'idle') return;
    if ('pointerId' in it && it.pointerId !== e.pointerId) return;

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (it.kind === 'drag-tokens' && it.pendingDelta) {
      moveSelectedBy(it.pendingDelta);
    }

    if (it.kind === 'drag-follower' && it.pendingDelta) {
      moveFollowerBy(it.performerId, it.pendingDelta);
    }

    if (it.kind === 'marquee') {
      // Commit selection by hit-testing against marquee rect
      const x1 = Math.min(it.startScreen.x, it.currentScreen.x);
      const y1 = Math.min(it.startScreen.y, it.currentScreen.y);
      const x2 = Math.max(it.startScreen.x, it.currentScreen.x);
      const y2 = Math.max(it.startScreen.y, it.currentScreen.y);
      // Treat tiny marquees as a click → don't change selection
      if (x2 - x1 > 4 || y2 - y1 > 4) {
        const hits = Array.from(
          new Set(
            tokens
              .filter((t) => t.x >= x1 && t.x <= x2 && t.y >= y1 && t.y <= y2)
              .map((t) => t.performer.id),
          ),
        );
        if (e.shiftKey) {
          const next = Array.from(new Set([...selected, ...hits]));
          setSelection(next);
        } else {
          setSelection(hits);
        }
      }
    }

    interactionRef.current = { kind: 'idle' };
    const svg = svgRef.current;
    if (svg) {
      try {
        svg.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // ---- Marquee rect (read live from ref) -------------------------------
  const marquee = (() => {
    const it = interactionRef.current;
    if (it.kind !== 'marquee') return null;
    const x1 = Math.min(it.startScreen.x, it.currentScreen.x);
    const y1 = Math.min(it.startScreen.y, it.currentScreen.y);
    const x2 = Math.max(it.startScreen.x, it.currentScreen.x);
    const y2 = Math.max(it.startScreen.y, it.currentScreen.y);
    if (x2 - x1 < 2 && y2 - y1 < 2) return null;
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  })();

  // ---- Snap indicator: highlight the grid cell under the primary
  // performer while dragging. Provides visual feedback that snap is active.
  const snapIndicator = (() => {
    const it = interactionRef.current;
    if (it.kind !== 'drag-tokens') return null;
    const st = states[it.primaryId];
    if (!st) return null;
    // Only show if the position is actually on the snap grid
    // (i.e. user didn't hold Shift for free movement)
    const onGrid =
      Math.abs(Math.round(st.position.x / 0.5) * 0.5 - st.position.x) < 1e-6 &&
      Math.abs(Math.round(st.position.y / 0.5) * 0.5 - st.position.y) < 1e-6;
    if (!onGrid) return null;
    const center = stageToScreen(st.position.x, st.position.y);
    return center;
  })();
  // marqueeTick is intentionally referenced to force re-render during drag
  void marqueeTick;

  return (
    <div
      ref={containerRef}
      className="editor-surface absolute inset-0 bg-bg touch-none select-none"
    >
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        className="block h-full w-full"
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <g pointerEvents="none">
          {/* Stage floor — solid color, grid is the only structure */}
          <rect
            x={offsetX}
            y={offsetY}
            width={stagePx}
            height={stagePx}
            fill={bg}
            stroke="#5a3a1a"
            strokeWidth={3}
            rx={6}
          />

          {/* Meter grid lines (every 1m, slightly thicker every 5m).
              Pinned to half-integer pixel offsets so 1px lines render crisp. */}
          {Array.from({ length: stageMeters + 1 }, (_, i) => i - stageMeters / 2).map((m) => {
            const isMajor = m % 5 === 0;
            const isCenter = m === 0;
            // crispEdges + 0.5px offset = sharp 1px lines on integer-aligned coords
            const sx = Math.round(offsetX + (m + stageMeters / 2) * pxPerMeter) + 0.5;
            const sy = Math.round(offsetY + (m + stageMeters / 2) * pxPerMeter) + 0.5;
            return (
              <g key={m} shapeRendering="crispEdges">
                {/* Vertical line at x = m */}
                <line
                  x1={sx}
                  y1={offsetY}
                  x2={sx}
                  y2={offsetY + stagePx}
                  stroke={isCenter ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.22)'}
                  strokeWidth={isCenter ? 2 : isMajor ? 1.25 : 1}
                />
                {/* Horizontal line at y = m */}
                <line
                  x1={offsetX}
                  y1={sy}
                  x2={offsetX + stagePx}
                  y2={sy}
                  stroke={isCenter ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.22)'}
                  strokeWidth={isCenter ? 2 : isMajor ? 1.25 : 1}
                />
              </g>
            );
          })}

          {/* Axis labels — every 2m on the bottom (X) and left (Y) edges */}
          {Array.from({ length: stageMeters + 1 }, (_, i) => i - stageMeters / 2)
            .filter((m) => m % 2 === 0)
            .map((m) => {
              const sx = Math.round(offsetX + (m + stageMeters / 2) * pxPerMeter);
              const sy = Math.round(offsetY + (m + stageMeters / 2) * pxPerMeter);
              const isCenter = m === 0;
              return (
                <g key={`label-${m}`}>
                  {/* X tick label below stage */}
                  <text
                    x={sx}
                    y={offsetY + stagePx + 14}
                    textAnchor="middle"
                    fontSize="9"
                    fill={isCenter ? '#fff' : '#aaa'}
                    fontWeight={isCenter ? 700 : 400}
                  >
                    {m}
                  </text>
                  {/* Y tick label left of stage (Cartesian: positive y = up = upstage) */}
                  <text
                    x={offsetX - 6}
                    y={sy + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill={isCenter ? '#fff' : '#aaa'}
                    fontWeight={isCenter ? 700 : 400}
                  >
                    {-m}
                  </text>
                </g>
              );
            })}

          {/* Axis unit hint */}
          <text
            x={offsetX + stagePx + 4}
            y={offsetY + stagePx + 14}
            fontSize="9"
            fill="#aaa"
          >
            m
          </text>

          {/* UPSTAGE / DOWNSTAGE labels */}
          <text
            x={offsetX + stagePx / 2}
            y={offsetY - 12}
            textAnchor="middle"
            fontSize="10"
            fill="#bbb"
            fontWeight={600}
          >
            UPSTAGE
          </text>
          <text
            x={offsetX + stagePx / 2}
            y={offsetY + stagePx + 32}
            textAnchor="middle"
            fontSize="10"
            fill="#bbb"
            fontWeight={600}
          >
            DOWNSTAGE (audience)
          </text>
        </g>

        <g pointerEvents="none">
          {/* Transition paths from the previous formation → current position.
              Shows each performer's move as a thin colored line. */}
          {(() => {
            if (!currentFormationId || isPlaying) return null;
            const sorted = [...choreo.formations].sort((a, b) => a.timeSec - b.timeSec);
            const idx = sorted.findIndex((x) => x.id === currentFormationId);
            if (idx <= 0) return null;
            const prev = sorted[idx - 1];
            const current = sorted[idx];
            return choreo.performers.map((p) => {
              const a = prev.states[p.id];
              const b = current.states[p.id];
              if (!a || !b) return null;
              const from = stageToScreen(a.position.x, a.position.y);
              const to = stageToScreen(b.position.x, b.position.y);
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              if (dx * dx + dy * dy < 4) return null;
              return (
                <line
                  key={`path-${p.id}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={p.color}
                  strokeWidth={1.5}
                  opacity={0.5}
                  strokeDasharray="2 3"
                />
              );
            });
          })()}
        </g>

        <g>
          {/* Connector lines between Leader and Follower of split couples */}
          {choreo.performers.map((p) => {
            const st = states[p.id];
            if (!st || !st.splitOffset) return null;
            const leader = stageToScreen(st.position.x, st.position.y);
            const follower = stageToScreen(
              st.position.x + st.splitOffset.x,
              st.position.y + st.splitOffset.y,
            );
            return (
              <line
                key={`connector-${p.id}`}
                x1={leader.x}
                y1={leader.y}
                x2={follower.x}
                y2={follower.y}
                stroke={p.color}
                strokeWidth={2}
                strokeDasharray="2 3"
                opacity={0.5}
                pointerEvents="none"
              />
            );
          })}

          {tokens.map(({ key, performer, role, x, y, stagePos, rotationDeg, isSelected }) => {
            const rad = (rotationDeg * Math.PI) / 180;
            const handleX = x + Math.sin(rad) * ROTATION_HANDLE_DIST;
            const handleY = y - Math.cos(rad) * ROTATION_HANDLE_DIST;
            const isFollower = role === 'follower';
            const label = role === 'solo'
              ? (performer.initials ?? '')
              : role === 'leader'
                ? `${performer.initials ?? ''}·L`
                : `${performer.initials ?? ''}·F`;
            return (
              <g key={key}>
                {/* Facing line: from token center toward the rotation handle.
                    Only the leader/solo owns rotation. */}
                {isSelected && !isFollower && (
                  <line
                    x1={x}
                    y1={y}
                    x2={handleX}
                    y2={handleY}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    opacity={0.7}
                    pointerEvents="none"
                  />
                )}
                {/* Token group */}
                <g
                  transform={`translate(${x}, ${y})`}
                  onPointerDown={(e) =>
                    isFollower
                      ? handleFollowerPointerDown(e, performer.id)
                      : handleTokenPointerDown(e, performer.id)
                  }
                  style={{ cursor: isPlaying ? 'pointer' : 'grab' }}
                >
                  {/* Outer ring for follower — a hollow ring, not solid */}
                  {isFollower ? (
                    <>
                      <circle
                        r={TOKEN_R - 2}
                        fill="none"
                        stroke={performer.color}
                        strokeWidth={4}
                      />
                      <circle
                        r={TOKEN_R - 2}
                        fill="none"
                        stroke={isSelected ? '#ffffff' : '#1a1208'}
                        strokeWidth={isSelected ? 2 : 1.5}
                        strokeDasharray="3 2"
                      />
                    </>
                  ) : (
                    <>
                      <circle
                        r={TOKEN_R}
                        fill={performer.color}
                        stroke={isSelected ? '#ffffff' : '#1a1208'}
                        strokeWidth={isSelected ? 3 : 2}
                      />
                      {isSelected && (
                        <circle
                          r={TOKEN_R + 4}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                          opacity={0.6}
                        />
                      )}
                      {/* Facing pip — only on solo/leader */}
                      <circle
                        cx={Math.sin(rad) * (TOKEN_R - 4)}
                        cy={-Math.cos(rad) * (TOKEN_R - 4)}
                        r={3}
                        fill="#ffffff"
                        opacity={0.85}
                        pointerEvents="none"
                      />
                    </>
                  )}
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    fontSize={role === 'solo' ? 12 : 10}
                    fontWeight="700"
                    fill={isFollower ? performer.color : '#ffffff'}
                    pointerEvents="none"
                    style={{
                      textShadow: isFollower
                        ? '0 1px 2px rgba(255,255,255,0.8)'
                        : '0 1px 2px rgba(0,0,0,0.6)',
                    }}
                  >
                    {label}
                  </text>
                </g>
                {/* Rotation handle — only on leader/solo, not follower */}
                {isSelected && !isPlaying && !isFollower && (
                  <circle
                    cx={handleX}
                    cy={handleY}
                    r={6}
                    fill="#ffffff"
                    stroke={performer.color}
                    strokeWidth={2}
                    style={{ cursor: 'crosshair' }}
                    onPointerDown={(e) =>
                      handleRotationPointerDown(e, performer.id, stagePos)
                    }
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* Marquee rectangle */}
        {marquee && (
          <rect
            x={marquee.x}
            y={marquee.y}
            width={marquee.w}
            height={marquee.h}
            fill="rgba(124, 92, 255, 0.15)"
            stroke="#7c5cff"
            strokeWidth={1}
            strokeDasharray="3 3"
            pointerEvents="none"
          />
        )}

        {/* Snap indicator: crosshair centered on primary performer's snap point */}
        {snapIndicator && (
          <g pointerEvents="none" opacity={0.85}>
            <circle
              cx={snapIndicator.x}
              cy={snapIndicator.y}
              r={4}
              fill="none"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            <line
              x1={snapIndicator.x - 10}
              y1={snapIndicator.y}
              x2={snapIndicator.x + 10}
              y2={snapIndicator.y}
              stroke="#ffffff"
              strokeWidth={1}
            />
            <line
              x1={snapIndicator.x}
              y1={snapIndicator.y - 10}
              x2={snapIndicator.x}
              y2={snapIndicator.y + 10}
              stroke="#ffffff"
              strokeWidth={1}
            />
          </g>
        )}
      </svg>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
