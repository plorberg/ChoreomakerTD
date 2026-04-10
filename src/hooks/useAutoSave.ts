'use client';

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { choreoRepo } from '@/lib/supabase/choreoRepo';

export function useAutoSave(debounceMs = 1500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = useEditorStore.subscribe(
      (s) => s.choreo,
      (choreo) => {
        if (!choreo) return;
        if (!useEditorStore.getState().dirty) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
          try {
            await choreoRepo.saveFromClient(choreo);
            useEditorStore.getState().markClean();
          } catch (e) {
            console.error('autosave failed', e);
          }
        }, debounceMs);
      },
    );
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [debounceMs]);

  // ⌘S / Ctrl+S manual save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        const c = useEditorStore.getState().choreo;
        if (c) {
          choreoRepo
            .saveFromClient(c)
            .then(() => useEditorStore.getState().markClean())
            .catch((err) => console.error(err));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
