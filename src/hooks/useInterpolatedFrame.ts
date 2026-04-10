'use client';

import { useEditorStore } from '@/store/editorStore';
import type { Formation, PerformerState, Vec2 } from '@/domain/choreo';

/**
 * Returns the rendered state of every performer at the current playhead
 * by linearly interpolating between the two surrounding formations.
 *
 *   - When the playhead sits on a formation exactly → that formation's state.
 *   - Between two formations → LERP positions and rotations.
 *   - Before the first formation → snap to the first.
 *   - After the last formation → snap to the last.
 *
 * Rotation is interpolated via shortest-arc to avoid spinning the wrong way.
 *
 * Both Stage2D and Stage3D consume this hook, so playback is consistent
 * across views for free.
 */
export interface InterpolatedFrame {
  states: Record<string, PerformerState>;
  /** The formation considered "active" (the one last reached). */
  activeFormation: Formation | null;
  /** 0..1 progress to the next formation (0 if on or past the last). */
  progress: number;
}

export function useInterpolatedFrame(): InterpolatedFrame {
  return useEditorStore((s) => {
    if (!s.choreo) return { states: {}, activeFormation: null, progress: 0 };

    const sorted = [...s.choreo.formations].sort((a, b) => a.timeSec - b.timeSec);
    if (sorted.length === 0) return { states: {}, activeFormation: null, progress: 0 };

    const t = s.playheadSec;

    // Before first
    if (t <= sorted[0].timeSec) {
      return { states: sorted[0].states, activeFormation: sorted[0], progress: 0 };
    }
    // After last
    const last = sorted[sorted.length - 1];
    if (t >= last.timeSec) {
      return { states: last.states, activeFormation: last, progress: 0 };
    }

    // Between two
    let fromIdx = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].timeSec <= t && sorted[i + 1].timeSec > t) {
        fromIdx = i;
        break;
      }
    }
    const from = sorted[fromIdx];
    const to = sorted[fromIdx + 1];
    const span = to.timeSec - from.timeSec || 1;
    const raw = (t - from.timeSec) / span;
    // Ease-in-out for a less robotic feel
    const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;

    const states: Record<string, PerformerState> = {};
    for (const performer of s.choreo.performers) {
      const a = from.states[performer.id];
      const b = to.states[performer.id];
      if (!a && !b) continue;
      if (!a) {
        states[performer.id] = b!;
        continue;
      }
      if (!b) {
        states[performer.id] = a;
        continue;
      }
      states[performer.id] = {
        position: lerpVec2(a.position, b.position, eased),
        rotationDeg: lerpAngle(a.rotationDeg, b.rotationDeg, eased),
      };
    }
    return { states, activeFormation: from, progress: raw };
  });
}

function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + 540) % 360) - 180; // shortest arc
  return a + diff * t;
}
