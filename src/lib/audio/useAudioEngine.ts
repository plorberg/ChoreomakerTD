'use client';

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';

/**
 * Minimal audio engine. Version 1 wires an HTMLAudioElement to the
 * editor store's playhead. Upgrade path: replace with WaveSurfer.js or
 * Tone.js for waveform + BPM detection without touching consumers.
 */
export function useAudioEngine() {
  const audio = useEditorStore((s) => s.choreo?.audio);
  const playing = useEditorStore((s) => s.isPlaying);
  const playhead = useEditorStore((s) => s.playheadSec);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const pause = useEditorStore((s) => s.pause);

  const elRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audio?.storagePath) return;
    const el = new Audio(audio.storagePath);
    elRef.current = el;
    const onTime = () => setPlayhead(el.currentTime);
    const onEnd = () => pause();
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnd);
    return () => {
      el.pause();
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnd);
      elRef.current = null;
    };
  }, [audio?.storagePath, pause, setPlayhead]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (playing) el.play().catch(() => pause());
    else el.pause();
  }, [playing, pause]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (Math.abs(el.currentTime - playhead) > 0.2) el.currentTime = playhead;
  }, [playhead]);
}
