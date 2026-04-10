'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { exportChoreoPdf } from '@/lib/pdf/ChoreoPdf';
import { usePlaybackTick } from '@/hooks/usePlaybackTick';
import { useAudioEngine } from '@/lib/audio/useAudioEngine';

export function TransportBar() {
  const playing = useEditorStore((s) => s.isPlaying);
  const play = useEditorStore((s) => s.play);
  const pause = useEditorStore((s) => s.pause);
  const playhead = useEditorStore((s) => s.playheadSec);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const choreo = useEditorStore((s) => s.choreo);

  // Drive playback: audio if present, otherwise rAF loop
  useAudioEngine();
  usePlaybackTick();

  // Global keyboard: space, arrows, ⌘Z / ⌘⇧Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        playing ? pause() : play();
      } else if (e.key === 'ArrowLeft') {
        setPlayhead(playhead - 1);
      } else if (e.key === 'ArrowRight') {
        setPlayhead(playhead + 1);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.temporal.getState().undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        useEditorStore.temporal.getState().redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, play, pause, playhead, setPlayhead]);

  if (!choreo) return null;

  const duration = Math.max(
    choreo.audio?.durationSec ?? 0,
    choreo.formations.reduce((m, f) => Math.max(m, f.timeSec), 0) + 4,
  );

  return (
    <div className="border-t border-border bg-panel">
      {/* Timeline with formation markers */}
      <div className="relative h-8 px-4 pt-2">
        <div className="relative h-4 bg-bg border border-border rounded">
          {/* Formation marker pins */}
          {choreo.formations.map((f) => {
            const left = (f.timeSec / duration) * 100;
            return (
              <button
                key={f.id}
                onClick={() => setPlayhead(f.timeSec)}
                title={`${f.index + 1}. ${f.name}`}
                className="absolute top-0 bottom-0 w-1 bg-accent hover:w-1.5"
                style={{ left: `${left}%` }}
              />
            );
          })}
          {/* Playhead */}
          <div
            className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-white"
            style={{ left: `${(playhead / duration) * 100}%` }}
          />
        </div>
      </div>

      <div className="h-14 flex items-center gap-3 px-4">
        <button
          onClick={() => useEditorStore.temporal.getState().undo()}
          className="text-sm text-white/60 hover:text-white w-8 h-8"
          title="Undo (⌘Z)"
        >
          ↶
        </button>
        <button
          onClick={() => useEditorStore.temporal.getState().redo()}
          className="text-sm text-white/60 hover:text-white w-8 h-8"
          title="Redo (⌘⇧Z)"
        >
          ↷
        </button>

        <button
          onClick={playing ? pause : play}
          className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-lg hover:opacity-90"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '⏸' : '▶'}
        </button>

        <input
          type="range"
          min={0}
          max={duration}
          step={0.05}
          value={playhead}
          onChange={(e) => setPlayhead(parseFloat(e.target.value))}
          className="flex-1 accent-accent"
        />

        <span className="text-xs text-white/60 tabular-nums min-w-[90px] text-right">
          {playhead.toFixed(1)}s / {duration.toFixed(1)}s
        </span>

        <button
          onClick={() => exportChoreoPdf(choreo)}
          className="text-sm border border-border px-3 py-1.5 rounded hover:border-accent transition"
        >
          Export PDF
        </button>
      </div>
    </div>
  );
}
