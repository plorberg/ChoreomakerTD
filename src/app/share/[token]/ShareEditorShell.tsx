'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { Choreography } from '@/domain/choreo';
import { useEditorStore } from '@/store/editorStore';
import { useShareAutoSave } from '@/hooks/useShareAutoSave';
import { FormationList } from '@/components/editor/FormationList';
import { NotesPanel } from '@/components/editor/NotesPanel';
import { TransportBar } from '@/components/editor/TransportBar';
import { PerformerPanel } from '@/components/editor/PerformerPanel';
import { AudioPanel } from '@/components/editor/AudioPanel';
import { StagePanel } from '@/components/editor/StagePanel';
import type { ShareRole } from '@/lib/supabase/shareRepo';

const Stage2D = dynamic(() => import('@/components/editor/Stage2D').then((m) => m.Stage2D), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-white/40">Loading 2D…</div>,
});
const Stage3D = dynamic(() => import('@/components/editor/Stage3D').then((m) => m.Stage3D), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-white/40">Loading 3D…</div>,
});

type MobilePanel = 'stage' | 'list' | 'notes';

export function ShareEditorShell({
  initialChoreo,
  role,
  token,
}: {
  initialChoreo: Choreography;
  role: ShareRole;
  token: string;
}) {
  const load = useEditorStore((s) => s.load);
  const view = useEditorStore((s) => s.view);
  const setView = useEditorStore((s) => s.setView);
  const showTransitions = useEditorStore((s) => s.showTransitions);
  const setShowTransitions = useEditorStore((s) => s.setShowTransitions);
  const dirty = useEditorStore((s) => s.dirty);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('stage');

  useEffect(() => {
    load(initialChoreo);
  }, [initialChoreo, load]);

  // Editors get autosave; viewers don't (any local changes won't persist).
  // The role check is also enforced server-side in /api/share-save.
  useShareAutoSaveIfEditor(role, token);

  const isViewer = role === 'viewer';

  return (
    <div className="h-screen flex flex-col">
      {/* Read-only banner */}
      <div
        className={`h-10 flex items-center justify-between px-4 text-xs ${
          isViewer ? 'bg-amber-900/30 border-b border-amber-700/50' : 'bg-blue-900/30 border-b border-blue-700/50'
        }`}
      >
        <span className="font-medium">
          {isViewer ? '👁 Read-only shared view' : '✏ Editor shared view'}
        </span>
        <span className="text-white/60">{initialChoreo.title}</span>
      </div>

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

        <button
          onClick={() => setShowTransitions(!showTransitions)}
          className={`ml-3 px-2 py-1 rounded text-xs ${
            showTransitions ? 'bg-accent/60' : 'bg-border/50 hover:bg-border'
          }`}
        >
          Paths
        </button>

        <div className="ml-auto text-xs text-white/50">
          {isViewer ? 'View only' : dirty ? 'Unsaved…' : 'Saved'}
        </div>
      </div>

      <div
        className={`flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[240px_1fr_280px] ${
          isViewer ? 'pointer-events-auto' : ''
        }`}
      >
        <aside
          className={`border-r border-border bg-panel overflow-y-auto ${
            mobilePanel === 'list' ? '' : 'hidden md:block'
          } ${isViewer ? 'pointer-events-none opacity-70' : ''}`}
        >
          <FormationList />
          <PerformerPanel />
          <StagePanel />
          <AudioPanel />
        </aside>

        <section
          className={`relative min-h-0 ${mobilePanel === 'stage' ? '' : 'hidden md:block'}`}
        >
          {/* Disable pointer events on the stage when viewer to prevent dragging */}
          <div className={`absolute inset-0 ${isViewer ? 'pointer-events-none' : ''}`}>
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
          </div>
        </section>

        <aside
          className={`border-l border-border bg-panel overflow-y-auto ${
            mobilePanel === 'notes' ? '' : 'hidden md:block'
          } ${isViewer ? 'pointer-events-none opacity-70' : ''}`}
        >
          <NotesPanel />
        </aside>
      </div>

      <TransportBar />

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

/** Hook wrapper so we can conditionally enable autosave without breaking
 *  the rules of hooks. */
function useShareAutoSaveIfEditor(role: ShareRole, token: string) {
  // Always call the hook; pass a no-op token for viewer so the effect runs
  // but the inner subscription will never write because dirty stays false
  // (pointer-events-none on the editing surfaces prevents mutations).
  useShareAutoSave(role === 'editor' ? token : '');
}
