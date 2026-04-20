'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { exportChoreoPdf } from '@/lib/pdf/ChoreoPdf';
import { usePlaybackTick } from '@/hooks/usePlaybackTick';
import { useAudioEngine, setScrubbing } from '@/lib/audio/useAudioEngine';
import { formatTime } from '@/lib/format/time';

export function TransportBar() {
  const playing = useEditorStore((s) => s.isPlaying);
  const play = useEditorStore((s) => s.play);
  const pause = useEditorStore((s) => s.pause);
  const playhead = useEditorStore((s) => s.playheadSec);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const playbackRate = useEditorStore((s) => s.playbackRate);
  const setPlaybackRate = useEditorStore((s) => s.setPlaybackRate);
  const choreo = useEditorStore((s) => s.choreo);

  useAudioEngine();
  usePlaybackTick();

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        playing ? pause() : play();
        return;
      }

      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        const sel = useEditorStore.getState().selectedPerformerIds;
        if (sel.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 0.1 : 0.5;
          const dx =
            e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy =
            e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          useEditorStore.getState().moveSelectedBy({ x: dx, y: dy });
          return;
        }
        if (e.key === 'ArrowLeft') {
          setPlayhead(playhead - 1);
          return;
        }
        if (e.key === 'ArrowRight') {
          setPlayhead(playhead + 1);
          return;
        }
        return;
      }

      if (e.key === 'Escape') {
        useEditorStore.getState().clearSelection();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = useEditorStore.getState().selectedPerformerIds;
        if (sel.length === 0) return;
        e.preventDefault();
        const remove = useEditorStore.getState().removePerformer;
        for (const id of sel) remove(id);
      } else if (e.key === 'r' || e.key === 'R') {
        const sel = useEditorStore.getState().selectedPerformerIds;
        if (sel.length === 0) return;
        e.preventDefault();
        useEditorStore.getState().rotateSelectedBy(e.shiftKey ? -45 : 45);
      } else if (e.key === 's' || e.key === 'S') {
        if (e.metaKey || e.ctrlKey) return;
        const sel = useEditorStore.getState().selectedPerformerIds;
        if (sel.length === 0) return;
        e.preventDefault();
        const toggle = useEditorStore.getState().toggleCoupleSplit;
        for (const id of sel) toggle(id);
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

  const speedPercent = Math.round(playbackRate * 100);

  return (
    <div className="border-t border-border bg-panel">
      {/* Timeline scrubber */}
      <div className="relative h-8 px-4 pt-2">
        <div className="relative h-4 bg-bg border border-border rounded">
          {[...choreo.formations]
            .sort((a, b) => a.timeSec - b.timeSec)
            .map((f, i) => {
              const left = (f.timeSec / duration) * 100;
              return (
                <button
                  key={f.id}
                  onClick={() => setPlayhead(f.timeSec)}
                  title={`${i + 1}. ${f.name}`}
                  className="absolute top-0 bottom-0 w-1 bg-accent hover:w-1.5"
                  style={{ left: `${left}%` }}
                />
              );
            })}
          <div
            className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-white"
            style={{ left: `${(playhead / duration) * 100}%` }}
          />
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-1.5 md:py-2">
        {/* Undo / Redo — desktop only */}
        <div className="hidden md:flex gap-1">
          <button
            onClick={() => useEditorStore.temporal.getState().undo()}
            className="text-sm text-white/60 hover:text-white w-8 h-8"
            title="Undo"
          >
            ↶
          </button>
          <button
            onClick={() => useEditorStore.temporal.getState().redo()}
            className="text-sm text-white/60 hover:text-white w-8 h-8"
            title="Redo"
          >
            ↷
          </button>
        </div>

        {/* Play / Pause */}
        <button
          onClick={playing ? pause : play}
          className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-accent flex items-center justify-center text-base md:text-lg hover:opacity-90 flex-shrink-0"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '⏸' : '▶'}
        </button>

        {/* Playhead slider */}
        <input
          type="range"
          min={0}
          max={duration}
          step={0.05}
          value={playhead}
          onChange={(e) => setPlayhead(parseFloat(e.target.value))}
          onPointerDown={() => setScrubbing(true)}
          onPointerUp={() => setScrubbing(false)}
          onPointerCancel={() => setScrubbing(false)}
          className="flex-1 min-w-0 accent-accent"
        />

        {/* Time display */}
        <span className="text-[10px] md:text-xs text-white/60 tabular-nums whitespace-nowrap">
          {formatTime(playhead)}<span className="hidden sm:inline"> / {formatTime(duration)}</span>
        </span>

        {/* Speed input */}
        <div className="flex items-center gap-1 md:gap-1.5 border-l border-border pl-2">
          <span className="hidden sm:inline text-[10px] uppercase text-white/40">Speed</span>
          <input
            type="number"
            min={50}
            max={150}
            step={1}
            value={speedPercent}
            onChange={(e) => {
              const pct = parseInt(e.target.value) || 100;
              setPlaybackRate(Math.max(0.5, Math.min(1.5, pct / 100)));
            }}
            className="w-12 md:w-14 bg-bg border border-border rounded px-1 md:px-1.5 py-0.5 text-xs text-center tabular-nums outline-none focus:border-accent"
          />
          <span className="text-[10px] text-white/40">%</span>
        </div>

        {/* PDF Export */}
        <button
          onClick={() => exportChoreoPdf(choreo)}
          className="flex-shrink-0 text-xs md:text-sm border border-border px-2 md:px-3 py-1 md:py-1.5 rounded hover:border-accent transition"
          title="Export PDF"
        >
          <span className="hidden sm:inline">Export </span>PDF
        </button>
      </div>
    </div>
  );
}
