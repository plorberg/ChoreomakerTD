'use client';

import { useEditorStore } from '@/store/editorStore';
import type { Formation, PerformerState, Vec2 } from '@/domain/choreo';

/**
 * Returns interpolated performer states at the current playhead.
 *
 * Time model (per formation B following formation A):
 *   - B.timeSec       = absolute time when B must be reached.
 *   - B.transitionSec = duration (in seconds) of the move from A to B.
 *
 * Movement starts at moveStart = B.timeSec - B.transitionSec.
 * Before moveStart  → performers stay at A (hold).
 * Between moveStart and B.timeSec → linear interpolation A → B (eased).
 * After B.timeSec → performers stay at B until next move begins.
 *
 * If moveStart would be before A.timeSec, it's clamped to A.timeSec
 * (transition can't start before the previous formation exists).
 */
export interface InterpolatedFrame {
  states: Record<string, PerformerState>;
  activeFormation: Formation | null;
  progress: number;
}

const EMPTY: InterpolatedFrame = { states: {}, activeFormation: null, progress: 0 };
const DEFAULT_TRANSITION_SEC = 2;

export function useInterpolatedFrame(): InterpolatedFrame {
  const formations = useEditorStore((s) => s.choreo?.formations);
  const performers = useEditorStore((s) => s.choreo?.performers);
  const playheadSec = useEditorStore((s) => s.playheadSec);

  if (!formations || !performers || formations.length === 0) return EMPTY;

  const sorted = [...formations].sort((a, b) => a.timeSec - b.timeSec);
  const t = playheadSec;

  // Before first → snap to first
  if (t <= sorted[0].timeSec) {
    return { states: sorted[0].states, activeFormation: sorted[0], progress: 0 };
  }
  // After last → snap to last
  const last = sorted[sorted.length - 1];
  if (t >= last.timeSec) {
    return { states: last.states, activeFormation: last, progress: 1 };
  }

  // Find pair (A, B) where A.timeSec <= t < B.timeSec
  let fromIdx = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].timeSec <= t && sorted[i + 1].timeSec > t) {
      fromIdx = i;
      break;
    }
  }
  const A = sorted[fromIdx];
  const B = sorted[fromIdx + 1];

  const transition = Math.max(0, B.transitionSec ?? DEFAULT_TRANSITION_SEC);
  const moveStart = Math.max(A.timeSec, B.timeSec - transition);

  // Hold A until moveStart
  if (t <= moveStart) {
    return { states: A.states, activeFormation: A, progress: 0 };
  }

  // Linear interpolation A → B during [moveStart, B.timeSec]
  const span = B.timeSec - moveStart || 1;
  const raw = (t - moveStart) / span;
  const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;

  const states: Record<string, PerformerState> = {};
  for (const p of performers) {
    const a = A.states[p.id];
    const b = B.states[p.id];
    if (!a && !b) continue;
    if (!a) { states[p.id] = b!; continue; }
    if (!b) { states[p.id] = a; continue; }
    states[p.id] = {
      position: lerpVec2(a.position, b.position, eased),
      rotationDeg: lerpAngle(a.rotationDeg, b.rotationDeg, eased),
    };
  }

  return { states, activeFormation: A, progress: raw };
}

function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function lerpAngle(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
}
