'use client';

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';

/**
 * Autosave for share-token-based editing. Posts the choreo JSON to
 * /api/share-save instead of writing through the user-scoped Supabase client.
 */
export function useShareAutoSave(token: string, debounceMs = 1500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;
    const unsub = useEditorStore.subscribe(
      (s) => s.choreo,
      (choreo) => {
        if (!choreo) return;
        if (!useEditorStore.getState().dirty) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
          try {
            const res = await fetch('/api/share-save', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ token, choreo }),
            });
            if (res.ok) useEditorStore.getState().markClean();
            else console.error('share autosave failed', await res.text());
          } catch (e) {
            console.error('share autosave error', e);
          }
        }, debounceMs);
      },
    );

    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [token, debounceMs]);
}
