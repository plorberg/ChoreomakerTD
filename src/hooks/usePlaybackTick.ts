'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';

/**
 * When there is NO audio attached, we still want Play to animate through
 * formations. This hook runs a rAF loop that advances the playhead in real
 * time until the last formation, then pauses.
 *
 * When audio IS attached, the audio element drives the playhead via
 * useAudioEngine and this hook stays idle.
 */
export function usePlaybackTick() {
  const hasAudio = useEditorStore((s) => !!s.choreo?.audio?.storagePath);
  const isPlaying = useEditorStore((s) => s.isPlaying);

  useEffect(() => {
    if (hasAudio || !isPlaying) return;
    let raf = 0;
    let lastT = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastT) / 1000;
      lastT = now;
      const state = useEditorStore.getState();
      if (!state.choreo || !state.isPlaying) return;
      const lastFormationTime =
        state.choreo.formations.reduce((m, f) => Math.max(m, f.timeSec), 0) + 2;
      const next = state.playheadSec + dt;
      if (next >= lastFormationTime) {
        state.setPlayhead(lastFormationTime);
        state.pause();
        return;
      }
      state.setPlayhead(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasAudio, isPlaying]);
}
