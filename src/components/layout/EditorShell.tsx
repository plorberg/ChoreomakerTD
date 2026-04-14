'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { Choreography } from '@/domain/choreo';
import { useEditorStore } from '@/store/editorStore';
import { useAutoSave } from '@/hooks/useAutoSave';
import { FormationList } from '@/components/editor/FormationList';
import { NotesPanel } from '@/components/editor/NotesPanel';
import { TransportBar } from '@/components/editor/TransportBar';
import { PerformerPanel } from '@/components/editor/PerformerPanel';
import { AudioPanel } from '@/components/editor/AudioPanel';
import { StagePanel } from '@/components/editor/StagePanel';

const Stage2D = dynamic(() => import('@/components/editor/Stage2D').then((m) => m.Stage2D), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-white/40">Loading 2D…</div>,
});
const Stage3D = dynamic(() => import('@/components/editor/Stage3D').then((m) => m.Stage3D), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-white/40">Loading 3D…</div>,
});

type MobilePanel = 'stage' | 'list' | 'notes';

export function EditorShell({ initialChoreo }: { initialChoreo: Choreography }) {
  const load = useEditorStore((s) => s.load);
  const view = useEditorStore((s) => s.view);
  const setView = useEditorStore((s) => s.setView);
  const dirty = useEditorStore((s) => s.dirty);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('stage');

  useEffect(() => {
    load(initialChoreo);
  }, [initialChoreo, load]);

  useAutoSave();

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      {/* Toolbar */}
      <div className="h-10 border-b border-border flex items-center px-3 gap-2 bg-panel">
        <div className="flex gap-1 text-xs">
          {(['2d', '3d', 'split'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2 py-1 rounded uppercase ${
                view === v ? 'bg-accent' : 'bg-border/50 hover:bg-border'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-white/50">
          {dirty ? 'Unsaved…' : 'Saved'} · ⌘S
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[240px_1fr_280px]">
        <aside
          className={`border-r border-border bg-panel overflow-y-auto ${
            mobilePanel === 'list' ? '' : 'hidden md:block'
          }`}
        >
          <FormationList />
          <PerformerPanel />
          <StagePanel />
          <AudioPanel />
        </aside>

        <section
          className={`relative min-h-0 ${mobilePanel === 'stage' ? '' : 'hidden md:block'}`}
        >
          {view === '2d' && <Stage2D />}
          {view === '3d' && <Stage3D />}
          {view === 'split' && (
            <div className="h-full grid grid-rows-2 md:grid-rows-1 md:grid-cols-2">
              <div className="relative">
                <Stage2D />
              </div>
              <div className="relative border-l border-border">
                <Stage3D />
              </div>
            </div>
          )}
        </section>

        <aside
          className={`border-l border-border bg-panel overflow-y-auto ${
            mobilePanel === 'notes' ? '' : 'hidden md:block'
          }`}
        >
          <NotesPanel />
        </aside>
      </div>

      <TransportBar />

      {/* Mobile bottom tabs */}
      <nav className="md:hidden h-12 border-t border-border flex bg-panel">
        {(['list', 'stage', 'notes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobilePanel(tab)}
            className={`flex-1 text-xs capitalize ${
              mobilePanel === tab ? 'text-accent' : 'text-white/60'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
