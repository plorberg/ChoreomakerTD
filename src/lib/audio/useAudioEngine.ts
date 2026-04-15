'use client';

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';

/**
 * Audio engine built on the Web Audio API.
 *
 * Why not <audio>? The HTMLAudioElement has known issues with seeking
 * MP3s served from cloud storage (Range request quirks, async seek with
 * race conditions, ended-event not firing on incorrect metadata). The
 * Web Audio API decodes the file once into an AudioBuffer; playback then
 * uses AudioBufferSourceNode whose start(when, offset) is sample-accurate.
 *
 * Sample-rate gotcha: AudioContext picks a sampleRate at construction
 * (often the system's output, e.g. 48000Hz). decodeAudioData resamples
 * the source to that rate. Resampling on some browsers (Firefox, Safari)
 * is poor quality AND drops samples, which sounds slow + muddy. We avoid
 * this by reading the source's native sampleRate first (via a temporary
 * OfflineAudioContext probe), then constructing the playback AudioContext
 * with that exact rate so no resampling happens.
 */

// --- Module-globals -------------------------------------------------------

let audioCtx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let source: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let startedAtCtxTime = 0;
let offsetSec = 0;
let isPlayingNow = false;
let currentRate = 1;
let loadId = 0;

let scrubbing = false;
export function setScrubbing(v: boolean) {
  scrubbing = v;
}
export function isScrubbing(): boolean {
  return scrubbing;
}

/** Current playback position, in buffer seconds. */
export function getCurrentAudioPosition(): number | null {
  if (!buffer) return null;
  if (!isPlayingNow || !audioCtx) return offsetSec;
  const elapsed = (audioCtx.currentTime - startedAtCtxTime) * currentRate;
  return Math.max(0, Math.min(buffer.duration, offsetSec + elapsed));
}

export function isAudioLoaded(): boolean {
  return buffer !== null;
}

// --- Internals ------------------------------------------------------------

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext
  );
}

/**
 * Probe the source's native sample rate without committing to a playback
 * AudioContext. We use an OfflineAudioContext at a placeholder rate just
 * to get decodeAudioData; the resulting buffer's sampleRate field is the
 * file's native rate (browsers have to read it from the file header to
 * decode correctly).
 *
 * Note: the OfflineAudioContext WILL resample the buffer it returns, so
 * we don't keep that buffer — we just look at its sampleRate. The real
 * decode happens against an AudioContext that matches.
 */
async function probeSampleRate(arrayBuf: ArrayBuffer): Promise<number> {
  // Workable across browsers: 44100 is universally supported.
  const Off =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  const probe = new Off(1, 1, 44100);
  // Probe needs a copy because decodeAudioData detaches the buffer
  const copy = arrayBuf.slice(0);
  const decoded = await probe.decodeAudioData(copy);
  return decoded.sampleRate;
}

async function ensureCtxWithRate(sampleRate: number): Promise<AudioContext> {
  if (audioCtx && audioCtx.sampleRate === sampleRate) return audioCtx;
  // Different rate (or first time) — tear down and rebuild.
  if (audioCtx) {
    try {
      stopSource();
      await audioCtx.close();
    } catch {
      /* ignore */
    }
    audioCtx = null;
    gainNode = null;
  }
  const Ctx = getAudioContextCtor();
  audioCtx = new Ctx({ sampleRate });
  gainNode = audioCtx.createGain();
  gainNode.connect(audioCtx.destination);
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
  if (!buffer || !audioCtx || !gainNode) return;
  await audioCtx.resume();

  const startPos = Math.max(0, Math.min(buffer.duration, sec));
  stopSource();

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = currentRate;
  src.connect(gainNode);

  const captured = src;
  src.onended = () => {
    if (source !== captured) return;
    isPlayingNow = false;
    const store = useEditorStore.getState();
    if (store.isPlaying) store.pause();
  };

  source = src;
  offsetSec = startPos;
  startedAtCtxTime = audioCtx.currentTime;
  isPlayingNow = true;
  src.start(0, startPos);
}

function stopAndCapturePosition() {
  if (!isPlayingNow) return;
  const pos = getCurrentAudioPosition() ?? offsetSec;
  offsetSec = pos;
  stopSource();
  isPlayingNow = false;
}

// --- React hook -----------------------------------------------------------

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
      return;
    }
    const myLoadId = ++loadId;

    (async () => {
      try {
        const res = await fetch(audio.storagePath);
        if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);
        const arrayBuf = await res.arrayBuffer();

        // Probe the source's native sample rate first, then build the
        // playback AudioContext with that rate so decode does no
        // resampling. This is what makes the audio sound full-quality
        // and play at correct speed.
        const nativeRate = await probeSampleRate(arrayBuf);
        const ctx = await ensureCtxWithRate(nativeRate);
        const decoded = await ctx.decodeAudioData(arrayBuf);

        if (myLoadId !== loadId) return;
        buffer = decoded;
        offsetSec = 0;
      } catch (e) {
        console.error('[audio] could not load track:', e);
        if (myLoadId === loadId) buffer = null;
      }
    })();

    return () => {
      stopSource();
    };
  }, [audio?.storagePath]);

  useEffect(() => {
    currentRate = playbackRate;
    if (source && audioCtx) {
      try {
        source.playbackRate.setValueAtTime(playbackRate, audioCtx.currentTime);
      } catch {
        /* ignore */
      }
      const pos = getCurrentAudioPosition() ?? offsetSec;
      offsetSec = pos;
      startedAtCtxTime = audioCtx.currentTime;
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
    if (Math.abs(playhead - lastAppliedPlayheadRef.current) < 0.02) return;
    lastAppliedPlayheadRef.current = playhead;

    if (isPlayingNow) {
      startAt(playhead).catch(() => {
        /* ignore */
      });
    } else {
      offsetSec = Math.max(0, Math.min(buffer.duration, playhead));
    }
  }, [playhead]);
}
