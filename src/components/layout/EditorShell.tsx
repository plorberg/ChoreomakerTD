'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { Choreography } from '@/domain/choreo';
import { useEditorStore } from '@/store/editorStore';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useCollab } from '@/hooks/useCollab';
import { FormationList } from '@/components/editor/FormationList';
import { NotesPanel } from '@/components/editor/NotesPanel';
import { TransportBar } from '@/components/editor/TransportBar';
import { PerformerPanel } from '@/components/editor/PerformerPanel';
import { AudioPanel } from '@/components/editor/AudioPanel';
import { StagePanel } from '@/components/editor/StagePanel';
import { PresenceAvatars } from '@/components/collab/PresenceAvatars';
import { RelativeTime } from '@/components/ui/RelativeTime';

const Stage2D = dynamic(() => import('@/components/editor/Stage2D').then((m) => m.Stage2D), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-white/40">Loading 2D…</div>,
});
const Stage3D = dynamic(() => import('@/components/editor/Stage3D').then((m) => m.Stage3D), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-white/40">Loading 3D…</div>,
});

type MobilePanel = 'stage' | 'list' | 'notes';

interface Props {
  initialChoreo: Choreography;
  currentUser: { email: string; displayName: string };
}

export function EditorShell({ initialChoreo, currentUser }: Props) {
  const load = useEditorStore((s) => s.load);
  const view = useEditorStore((s) => s.view);
  const setView = useEditorStore((s) => s.setView);
  const showTransitions = useEditorStore((s) => s.showTransitions);
  const setShowTransitions = useEditorStore((s) => s.setShowTransitions);
  const showDistances = useEditorStore((s) => s.showDistances);
  const setShowDistances = useEditorStore((s) => s.setShowDistances);
  const dirty = useEditorStore((s) => s.dirty);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('stage');

  useEffect(() => {
    load(initialChoreo);
  }, [initialChoreo, load]);

  useAutoSave();

  const { peers, cursors } = useCollab({
    choreoId: initialChoreo.id,
    currentUser,
  });

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

        <button
          onClick={() => setShowTransitions(!showTransitions)}
          className={`ml-3 px-2 py-1 rounded text-xs ${
            showTransitions ? 'bg-accent/60' : 'bg-border/50 hover:bg-border'
          }`}
          title="Toggle transition paths between formations"
        >
          Paths
        </button>

        <button
          onClick={() => setShowDistances(!showDistances)}
          className={`px-2 py-1 rounded text-xs ${
            showDistances ? 'bg-accent/60' : 'bg-border/50 hover:bg-border'
          }`}
          title="Show top 3 longest distances per formation in the side panel"
        >
          Distances
        </button>

        <ChoreoTitle />

        <div className="text-xs text-white/50 flex items-center gap-2">
          {dirty ? (
            <span className="text-amber-300">Unsaved…</span>
          ) : lastSavedAt ? (
            <span>
              Saved · <RelativeTime ms={lastSavedAt} />
            </span>
          ) : (
            <span>Saved</span>
          )}
          <span className="text-white/30">· ⌘S</span>
        </div>

        <div className="ml-2 pl-2 border-l border-border">
          <PresenceAvatars peers={peers} />
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
          {view === '2d' && <Stage2D cursors={cursors} />}
          {view === '3d' && <Stage3D />}
          {view === 'split' && (
            <div className="h-full grid grid-rows-2 md:grid-rows-1 md:grid-cols-2">
              <div className="relative">
                <Stage2D cursors={cursors} />
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

function ChoreoTitle() {
  const title = useEditorStore((s) => s.choreo?.title ?? '');
  const rename = useEditorStore((s) => s.renameChoreography);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        defaultValue={title}
        maxLength={200}
        onBlur={(e) => {
          rename(e.target.value);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            rename((e.target as HTMLInputElement).value);
            setEditing(false);
          } else if (e.key === 'Escape') {
            setEditing(false);
          }
        }}
        className="ml-auto text-sm bg-bg border border-accent rounded px-2 py-0.5 outline-none w-64"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to rename"
      className="ml-auto text-sm font-medium text-white/80 hover:text-white truncate max-w-xs px-2 py-0.5 rounded hover:bg-border/50"
    >
      {title || 'Untitled'}
    </button>
  );
}
