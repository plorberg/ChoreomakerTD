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
 * Before moveStart  → hold A.
 * Between moveStart and B.timeSec → eased A → B.
 * After B.timeSec → hold B.
 *
 * IMPORTANT: the entire computation lives inside a single selector so Zustand
 * calls it on every store update. The selector always returns a NEW object
 * literal so shallow equality (the default) will never short-circuit —
 * every mutation leads to a re-render. This was the source of a subtle bug
 * where initial drag updates would not render until the formation was
 * re-opened: when the two-step selector pattern is used (pick formations
 * array, then compute outside), a reference chain in immer + temporal can
 * leave the formations reference stale between paints.
 */
export interface InterpolatedFrame {
  states: Record<string, PerformerState>;
  activeFormation: Formation | null;
  progress: number;
}

const EMPTY: InterpolatedFrame = { states: {}, activeFormation: null, progress: 0 };
const DEFAULT_TRANSITION_SEC = 2;

export function useInterpolatedFrame(): InterpolatedFrame {
  return useEditorStore((s): InterpolatedFrame => {
    const choreo = s.choreo;
    if (!choreo) return { ...EMPTY };
    const formations = choreo.formations;
    const performers = choreo.performers;
    if (formations.length === 0) return { ...EMPTY };

    const sorted = [...formations].sort((a, b) => a.timeSec - b.timeSec);
    const t = s.playheadSec;

    // Before first → hold first
    if (t <= sorted[0].timeSec) {
      return {
        states: cloneStates(sorted[0].states),
        activeFormation: sorted[0],
        progress: 0,
      };
    }
    // After last → hold last
    const last = sorted[sorted.length - 1];
    if (t >= last.timeSec) {
      return {
        states: cloneStates(last.states),
        activeFormation: last,
        progress: 1,
      };
    }

    // Find pair (A, B) with A.timeSec <= t < B.timeSec
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
      return { states: cloneStates(A.states), activeFormation: A, progress: 0 };
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
      if (!a) { states[p.id] = cloneState(b!); continue; }
      if (!b) { states[p.id] = cloneState(a); continue; }

      let splitOffset: Vec2 | null | undefined = undefined;
      if (a.splitOffset || b.splitOffset) {
        const ao = a.splitOffset ?? { x: 0, y: 0 };
        const bo = b.splitOffset ?? { x: 0, y: 0 };
        splitOffset = lerpVec2(ao, bo, eased);
      }

      states[p.id] = {
        position: lerpVec2(a.position, b.position, eased),
        rotationDeg: lerpAngle(a.rotationDeg, b.rotationDeg, eased),
        splitOffset,
      };
    }
    return { states, activeFormation: A, progress: raw };
  });
}

function cloneStates(source: Record<string, PerformerState>): Record<string, PerformerState> {
  const out: Record<string, PerformerState> = {};
  for (const key in source) out[key] = cloneState(source[key]);
  return out;
}

function cloneState(st: PerformerState): PerformerState {
  return {
    position: { x: st.position.x, y: st.position.y },
    rotationDeg: st.rotationDeg,
    splitOffset: st.splitOffset
      ? { x: st.splitOffset.x, y: st.splitOffset.y }
      : st.splitOffset,
  };
}

function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function lerpAngle(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
}
