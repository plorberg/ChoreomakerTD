'use client';

import { useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useEditorStore } from '@/store/editorStore';
import { createClient } from '@/lib/supabase/client';

/**
 * Audio upload flow:
 *   1. User picks a file
 *   2. We probe the file for duration via a hidden <audio> element
 *   3. Upload to Supabase Storage bucket 'audio' at ${ownerId}/${uuid}.${ext}
 *   4. Create a signed URL (7 days) and store it on choreo.audio.storagePath
 *
 * Signed URLs keep files private while still playable in the browser.
 * When the URL expires, the editor just re-signs on next load.
 */
export function AudioPanel() {
  const choreo = useEditorStore((s) => s.choreo);
  const setAudio = useEditorStore((s) => s.setAudio);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!choreo) return null;

  async function onFile(file: File) {
    if (!choreo) return;
    setBusy(true);
    setErr(null);
    try {
      const duration = await probeDuration(file);
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'mp3';
      const path = `${choreo.ownerId}/${uuid()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('audio')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;

      const { data: signed, error: sErr } = await supabase.storage
        .from('audio')
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (sErr) throw sErr;

      setAudio({
        id: uuid(),
        name: file.name,
        storagePath: signed.signedUrl,
        durationSec: duration,
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onRemove() {
    setAudio(null);
  }

  return (
    <div className="p-3 border-t border-border">
      <h2 className="text-xs uppercase tracking-wider text-white/50 mb-2">Audio</h2>
      {choreo.audio ? (
        <div className="space-y-2">
          <div className="text-sm truncate">{choreo.audio.name}</div>
          <div className="text-xs text-white/50">{choreo.audio.durationSec.toFixed(1)}s</div>
          <button
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Remove audio
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-full text-sm border border-border rounded px-3 py-2 hover:border-accent disabled:opacity-50"
          >
            {busy ? 'Uploading…' : 'Upload audio'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
          {err && <p className="text-xs text-red-400 mt-2">{err}</p>}
        </>
      )}
    </div>
  );
}

function probeDuration(file: File): Promise<number> {
  // Strategy: try Web Audio API's decodeAudioData first — it actually
  // decodes the file and gives an exact duration. Falls back to the
  // <audio> element approach if Web Audio rejects (rare codecs, etc).
  return decodeWithWebAudio(file).catch(() => probeWithAudioElement(file));
}

async function decodeWithWebAudio(file: File): Promise<number> {
  const buf = await file.arrayBuffer();
  // Some browsers ship AudioContext, others webkitAudioContext (Safari < 14).
  const Ctx: typeof AudioContext | undefined =
    (typeof window !== 'undefined' && window.AudioContext) ||
    (typeof window !== 'undefined' &&
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext) ||
    undefined;
  if (!Ctx) throw new Error('Web Audio API unavailable');
  const ctx = new Ctx();
  try {
    // decodeAudioData returns a Promise in modern browsers; older Safari
    // requires the callback form, but anything that runs Next.js 15 has
    // the modern form.
    const audioBuf = await ctx.decodeAudioData(buf);
    return audioBuf.duration;
  } finally {
    // Best-effort cleanup
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
  }
}

function probeWithAudioElement(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement('audio');
    el.preload = 'metadata';

    let settled = false;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      el.onloadedmetadata = null;
      el.ondurationchange = null;
      el.onerror = null;
    };

    const finish = (dur: number) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(dur);
    };

    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        finish(el.duration);
        return;
      }
      el.currentTime = 1e10;
    };

    el.ondurationchange = () => {
      if (Number.isFinite(el.duration) && el.duration > 0 && el.duration < 1e9) {
        try {
          el.currentTime = 0;
        } catch {
          /* ignore */
        }
        finish(el.duration);
      }
    };

    el.onerror = () => {
      cleanup();
      reject(new Error('Could not read audio metadata'));
    };

    setTimeout(() => {
      if (!settled) {
        cleanup();
        reject(new Error('Audio metadata probe timed out'));
      }
    }, 8000);

    el.src = url;
  });
}
