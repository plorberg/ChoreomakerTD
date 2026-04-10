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
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement('audio');
    el.preload = 'metadata';
    el.src = url;
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(el.duration || 0);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read audio metadata'));
    };
  });
}
