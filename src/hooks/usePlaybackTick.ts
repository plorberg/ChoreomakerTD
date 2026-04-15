'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import {
  getCurrentAudioPosition,
  isAudioLoaded,
  isScrubbing,
} from '@/lib/audio/useAudioEngine';

/**
 * Drives the playhead at ~60fps via requestAnimationFrame whenever playback
 * is active.
 *
 *  - With audio: reads the AudioContext's sample-accurate position each
 *    frame so the SVG / 3D stage stays perfectly in sync with the music.
 *  - Without audio: advances `playheadSec` by `dt * playbackRate` each
 *    frame so animation still runs.
 *
 * While the user drags the slider (`isScrubbing()`), polling stops so
 * rapid setPlayhead calls don't race with audio position reads.
 */
export function usePlaybackTick() {
  const isPlaying = useEditorStore((s) => s.isPlaying);

  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    let lastT = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastT) / 1000;
      lastT = now;
      const state = useEditorStore.getState();
      if (!state.choreo || !state.isPlaying) return;

      // Audio-driven path — sample-accurate position from the Web Audio
      // engine. Skip while the user is actively scrubbing.
      if (state.choreo.audio?.storagePath && isAudioLoaded()) {
        if (!isScrubbing()) {
          const pos = getCurrentAudioPosition();
          if (pos != null) {
            state.setPlayhead(pos);
            // Hard-stop at our authoritative durationSec from
            // decodeAudioData. The Web Audio engine's onended will also
            // fire when the buffer plays out, but we double-check here in
            // case durationSec was clipped by the user (e.g. a future
            // "trim" feature).
            const dur = state.choreo.audio.durationSec;
            if (dur && pos >= dur - 0.05) {
              state.pause();
              state.setPlayhead(dur);
              return;
            }
          }
        }
        raf = requestAnimationFrame(tick);
        return;
      }

      // Audio-less: integrate dt manually.
      const lastFormationTime =
        state.choreo.formations.reduce((m, f) => Math.max(m, f.timeSec), 0) + 2;
      const next = state.playheadSec + dt * state.playbackRate;
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
  }, [isPlaying]);
}
