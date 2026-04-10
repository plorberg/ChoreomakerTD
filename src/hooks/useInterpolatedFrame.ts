'use client';

import { useMemo } from 'react';
import { useEditorStore } from '@/store/editorStore';
import type { Formation, Performer } from '@/domain/choreo';

type PerformerState = {
  position: { x: number; y: number };
};

export type InterpolatedFrame = {
  states: Record<string, PerformerState>;
  activeFormation: Formation | null;
  progress: number;
};

const EMPTY_FRAME: InterpolatedFrame = {
  states: {},
  activeFormation: null,
  progress: 0,
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function useInterpolatedFrame(): InterpolatedFrame {
  const choreo = useEditorStore((s) => s.choreo);
  const currentTime = useEditorStore((s) => s.currentTime);

  return useMemo(() => {
    if (!choreo) return EMPTY_FRAME;

    const sorted = [...choreo.formations].sort((a, b) => a.timeSec - b.timeSec);

    if (sorted.length === 0) {
      const states: Record<string, PerformerState> = {};

      for (const performer of choreo.performers) {
        states[performer.id] = {
          position: { x: 0, y: 0 },
        };
      }

      return {
        states,
        activeFormation: null,
        progress: 0,
      };
    }

    let prev = sorted[0];
    let next = sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].timeSec <= currentTime) {
        prev = sorted[i];
      }
      if (sorted[i].timeSec >= currentTime) {
        next = sorted[i];
        break;
      }
    }

    const span = next.timeSec - prev.timeSec;
    const progress = span <= 0 ? 0 : (currentTime - prev.timeSec) / span;

    const states: Record<string, PerformerState> = {};

    for (const performer of choreo.performers) {
      const prevPos =
        prev.positions?.[performer.id] ??
        prev.performers?.[performer.id] ??
        { x: 0, y: 0 };

      const nextPos =
        next.positions?.[performer.id] ??
        next.performers?.[performer.id] ??
        prevPos;

      states[performer.id] = {
        position: {
          x: lerp(prevPos.x, nextPos.x, progress),
          y: lerp(prevPos.y, nextPos.y, progress),
        },
      };
    }

    return {
      states,
      activeFormation: prev,
      progress,
    };
  }, [choreo, currentTime]);
}