'use client';

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';

/**
 * Audio engine built on the Web Audio API.
 *
 * This mirrors the simpler, reliable strategy from the older Choreo
 * project:
 *   - create one normal AudioContext
 *   - fetch the file
 *   - decode it directly with decodeAudioData
 *   - play via AudioBufferSourceNode.start(when, offset)
 *
 * Important sync detail:
 * The editor also updates `playheadSec` on every animation frame while
 * audio is playing so the UI stays visually in sync with the music. Those
 * playhead updates are informational; they must NOT be treated as manual
 * seeks, or the audio source will be restarted repeatedly during normal
 * playback. That was the real cause of the “slow / bad” sound here.
 */

let audioCtx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let source: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;

let startedAtCtxTime = 0;
let offsetSec = 0;
let isPlayingNow = false;
let currentRate = 1;
let loadId = 0;
let sourceInstanceId = 0;

let scrubbing = false;

export function setScrubbing(v: boolean) {
  scrubbing = v;
}

export function isScrubbing(): boolean {
  return scrubbing;
}

export function getCurrentAudioPosition(): number | null {
  if (!buffer) return null;
  if (!isPlayingNow || !audioCtx) return offsetSec;

  const elapsed = (audioCtx.currentTime - startedAtCtxTime) * currentRate;
  return Math.max(0, Math.min(buffer.duration, offsetSec + elapsed));
}

export function isAudioLoaded(): boolean {
  return buffer !== null;
}

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext
  );
}

function ensureCtx(): AudioContext {
  if (!audioCtx) {
    const Ctx = getAudioContextCtor();
    audioCtx = new Ctx();
    gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
  }

  return audioCtx;
}

function stopSource() {
  if (!source) return;

  try {
    source.onended = null;
  } catch {
    /* ignore */
  }

  try {
    source.stop();
  } catch {
    /* ignore */
  }

  try {
    source.disconnect();
  } catch {
    /* ignore */
  }

  source = null;
}

async function startAt(sec: number) {
  const ctx = ensureCtx();
  if (!buffer || !gainNode) return;

  await ctx.resume();

  const startPos = Math.max(0, Math.min(buffer.duration, sec));
  const mySourceInstanceId = ++sourceInstanceId;

  stopSource();

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = currentRate;
  src.connect(gainNode);

  src.onended = () => {
    if (sourceInstanceId !== mySourceInstanceId) return;

    isPlayingNow = false;
    source = null;

    const store = useEditorStore.getState();
    const dur = buffer?.duration ?? store.choreo?.audio?.durationSec ?? offsetSec;

    if (store.isPlaying) {
      store.pause();
      store.setPlayhead(dur);
    }
  };

  source = src;
  offsetSec = startPos;
  startedAtCtxTime = ctx.currentTime;
  isPlayingNow = true;

  src.start(0, startPos);
}

function stopAndCapturePosition() {
  if (!buffer) return;

  const pos = getCurrentAudioPosition() ?? offsetSec;
  offsetSec = Math.max(0, Math.min(buffer.duration, pos));
  stopSource();
  isPlayingNow = false;
}

export function useAudioEngine() {
  const audio = useEditorStore((s) => s.choreo?.audio);
  const playing = useEditorStore((s) => s.isPlaying);
  const playhead = useEditorStore((s) => s.playheadSec);
  const playbackRate = useEditorStore((s) => s.playbackRate);

  const lastAppliedPlayheadRef = useRef(0);

  useEffect(() => {
    if (!audio?.storagePath) {
      stopSource();
      buffer = null;
      isPlayingNow = false;
      offsetSec = 0;
      sourceInstanceId++;
      return;
    }

    const storagePath = audio.storagePath;
    const myLoadId = ++loadId;
    sourceInstanceId++;
    stopSource();
    isPlayingNow = false;
    offsetSec = 0;

    (async () => {
      try {
        const ctx = ensureCtx();
        await ctx.resume();

        // Always resolve through /api/audio-url. It handles:
        //   - Raw paths ("userId/uuid.mp3") → signs fresh
        //   - Old signed URLs ("https://...") → extracts raw path, signs fresh
        // This guarantees share-link visitors get a working URL even if
        // the stored URL expired months ago.
        const signRes = await fetch('/api/audio-url', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ path: storagePath }),
        });
        let audioUrl = storagePath;
        if (signRes.ok) {
          const { url } = await signRes.json();
          if (url) audioUrl = url;
        }

        const res = await fetch(audioUrl);
        if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);

        const arrayBuf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));

        if (myLoadId !== loadId) return;

        buffer = decoded;
        offsetSec = 0;
        lastAppliedPlayheadRef.current = 0;
      } catch (e) {
        console.error('[audio] could not load track:', e);
        if (myLoadId === loadId) {
          buffer = null;
          isPlayingNow = false;
          offsetSec = 0;
        }
      }
    })();

    return () => {
      sourceInstanceId++;
      stopSource();
      isPlayingNow = false;
    };
  }, [audio?.storagePath]);

  useEffect(() => {
    if (playbackRate === currentRate) return;

    const previousRate = currentRate;
    currentRate = playbackRate;

    if (source && audioCtx) {
      const elapsedAtPreviousRate = (audioCtx.currentTime - startedAtCtxTime) * previousRate;
      const nextOffset = offsetSec + elapsedAtPreviousRate;
      offsetSec = Math.max(0, Math.min(buffer?.duration ?? nextOffset, nextOffset));
      startedAtCtxTime = audioCtx.currentTime;

      try {
        source.playbackRate.setValueAtTime(playbackRate, audioCtx.currentTime);
      } catch {
        /* ignore */
      }
    }
  }, [playbackRate]);

  useEffect(() => {
    if (!buffer) return;

    if (playing) {
      startAt(playhead).catch((e) => {
        console.error('[audio] could not start:', e);
        useEditorStore.getState().pause();
      });
    } else {
      stopAndCapturePosition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    if (!buffer) return;

    const previousApplied = lastAppliedPlayheadRef.current;
    lastAppliedPlayheadRef.current = playhead;

    if (Math.abs(playhead - previousApplied) < 0.02) return;

    // During playback, `usePlaybackTick()` mirrors the current audio position
    // into `playheadSec` every frame. Those updates should not restart audio.
    // Only seek while actively scrubbing, or when the requested playhead is
    // materially different from the current audio position.
    if (isPlayingNow) {
      const currentPos = getCurrentAudioPosition();
      const drift = currentPos == null ? Infinity : Math.abs(playhead - currentPos);

      if (!isScrubbing() && drift < 0.12) {
        return;
      }

      startAt(playhead).catch(() => {
        /* ignore */
      });
      return;
    }

    offsetSec = Math.max(0, Math.min(buffer.duration, playhead));
  }, [playhead]);

  useEffect(() => {
    return () => {
      stopSource();
      isPlayingNow = false;
      try {
        audioCtx?.close();
      } catch {
        /* ignore */
      }
      audioCtx = null;
      gainNode = null;
      buffer = null;
      offsetSec = 0;
      sourceInstanceId++;
    };
  }, []);
}