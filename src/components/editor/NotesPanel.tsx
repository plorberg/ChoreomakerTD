'use client';

import { useCurrentFormation, useEditorStore } from '@/store/editorStore';
import { formatTimeInput, parseTimeInput } from '@/lib/format/time';

export function NotesPanel() {
  const formation = useCurrentFormation();
  const update = useEditorStore((s) => s.updateFormationMeta);

  if (!formation) {
    return <div className="p-3 text-white/40 text-sm">No formation selected</div>;
  }

  return (
    <div className="p-3 space-y-3">
      <h2 className="text-xs uppercase tracking-wider text-white/50">Details</h2>

      <label className="block text-xs text-white/60">
        Name
        <input
          className="w-full mt-1 bg-bg border border-border rounded px-2 py-1.5 text-sm"
          value={formation.name}
          onChange={(e) => update(formation.id, { name: e.target.value })}
        />
      </label>

      <label className="block text-xs text-white/60">
        Reach at (mm:ss or seconds)
        <input
          type="text"
          className="w-full mt-1 bg-bg border border-border rounded px-2 py-1.5 text-sm tabular-nums"
          defaultValue={formatTimeInput(formation.timeSec)}
          key={formation.id + ':' + formation.timeSec}
          onBlur={(e) => {
            const v = parseTimeInput(e.target.value);
            if (v != null) update(formation.id, { timeSec: v });
            else e.target.value = formatTimeInput(formation.timeSec);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-white/60" title="Duration of the move into this formation">
          Move duration (s)
          <input
            type="number"
            step="0.1"
            min="0"
            className="w-full mt-1 bg-bg border border-border rounded px-2 py-1.5 text-sm tabular-nums"
            value={formation.transitionSec ?? 2}
            onChange={(e) =>
              update(formation.id, { transitionSec: Math.max(0, parseFloat(e.target.value) || 0) })
            }
          />
        </label>
        <label className="block text-xs text-white/60">
          Counts
          <input
            type="number"
            min="0"
            className="w-full mt-1 bg-bg border border-border rounded px-2 py-1.5 text-sm tabular-nums"
            value={formation.counts ?? 8}
            onChange={(e) => update(formation.id, { counts: parseInt(e.target.value) || 0 })}
          />
        </label>
      </div>

      <p className="text-[10px] text-white/40 leading-relaxed">
        Move starts at <span className="tabular-nums">{formatTimeInput(Math.max(0, formation.timeSec - (formation.transitionSec ?? 2)))}</span>{' '}
        and ends at <span className="tabular-nums">{formatTimeInput(formation.timeSec)}</span>.
      </p>

      <SplitMergeSection />

      <DistancesSection />

      <label className="block text-xs text-white/60">
        Notes
        <textarea
          rows={12}
          placeholder="Transitions, props, intent, choreographer notes…"
          className="w-full mt-1 bg-bg border border-border rounded px-2 py-1.5 text-sm resize-none"
          value={formation.notes}
          onChange={(e) => update(formation.id, { notes: e.target.value })}
        />
      </label>
    </div>
  );
}

function SplitMergeSection() {
  const selected = useEditorStore((s) => s.selectedPerformerIds);
  const formation = useCurrentFormation();
  const toggle = useEditorStore((s) => s.toggleCoupleSplit);
  const split = useEditorStore((s) => s.splitCouple);
  const merge = useEditorStore((s) => s.mergeCouple);

  if (!formation || selected.length === 0) {
    return (
      <div className="border-t border-border pt-3">
        <h3 className="text-xs uppercase tracking-wider text-white/50 mb-1">Couple split</h3>
        <p className="text-[10px] text-white/40">Select a couple to split / merge.</p>
      </div>
    );
  }

  // Determine current split state across selection
  const selectedStates = selected.map((id) => formation.states[id]).filter(Boolean);
  const allSplit = selectedStates.every((st) => st.splitOffset);
  const noneSplit = selectedStates.every((st) => !st.splitOffset);

  return (
    <div className="border-t border-border pt-3">
      <h3 className="text-xs uppercase tracking-wider text-white/50 mb-2">Couple split</h3>
      <div className="flex gap-2">
        <button
          onClick={() => {
            for (const id of selected) split(id);
          }}
          disabled={allSplit}
          className="flex-1 text-xs px-2 py-1.5 rounded border border-border hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
          title="Split selected couples into Leader + Follower (this formation only)"
        >
          Split
        </button>
        <button
          onClick={() => {
            for (const id of selected) merge(id);
          }}
          disabled={noneSplit}
          className="flex-1 text-xs px-2 py-1.5 rounded border border-border hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
          title="Merge Leader + Follower back into one token"
        >
          Merge
        </button>
        <button
          onClick={() => {
            for (const id of selected) toggle(id);
          }}
          className="text-xs px-2 py-1.5 rounded border border-border hover:border-accent"
          title="Toggle split (keyboard: S)"
        >
          Toggle
        </button>
      </div>
      <p className="text-[10px] text-white/40 mt-1.5">
        Shortcut: press <kbd className="px-1 rounded bg-border/50 text-white/60">S</kbd> to toggle,
        <kbd className="px-1 rounded bg-border/50 text-white/60 ml-1">R</kbd> to rotate 45°.
      </p>
    </div>
  );
}

function DistancesSection() {
  const showDistances = useEditorStore((s) => s.showDistances);
  const choreo = useEditorStore((s) => s.choreo);
  const currentFormationId = useEditorStore((s) => s.currentFormationId);

  if (!showDistances || !choreo || !currentFormationId) return null;

  // Find the previous formation in chronological order
  const sorted = [...choreo.formations].sort((a, b) => a.timeSec - b.timeSec);
  const idx = sorted.findIndex((f) => f.id === currentFormationId);
  if (idx <= 0) {
    return (
      <div className="border-t border-border pt-3">
        <h3 className="text-xs uppercase tracking-wider text-white/50 mb-1">Distances</h3>
        <p className="text-[10px] text-white/40">First formation — no transition distances.</p>
      </div>
    );
  }

  const prev = sorted[idx - 1];
  const current = sorted[idx];

  // Compute distance per performer
  const distances: { id: string; name: string; color: string; dist: number }[] = [];
  for (const p of choreo.performers) {
    const a = prev.states[p.id];
    const b = current.states[p.id];
    if (!a || !b) continue;
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    distances.push({ id: p.id, name: p.name, color: p.color, dist });
  }

  // Sort by distance descending, take top 3
  distances.sort((a, b) => b.dist - a.dist);
  const top = distances.slice(0, 3);

  if (top.length === 0) {
    return (
      <div className="border-t border-border pt-3">
        <h3 className="text-xs uppercase tracking-wider text-white/50 mb-1">Distances</h3>
        <p className="text-[10px] text-white/40">No performers with movement data.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-3">
      <h3 className="text-xs uppercase tracking-wider text-white/50 mb-2">
        Top {top.length} longest distances
      </h3>
      <ol className="space-y-1.5">
        {top.map((d, i) => (
          <li key={d.id} className="flex items-center gap-2 text-sm">
            <span className="text-xs text-white/40 w-4 tabular-nums">{i + 1}.</span>
            <span
              className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20"
              style={{ backgroundColor: d.color }}
            />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="text-xs text-white/60 tabular-nums">{d.dist.toFixed(1)}m</span>
          </li>
        ))}
      </ol>
      {distances.length > 3 && (
        <p className="text-[10px] text-white/30 mt-1.5">
          …and {distances.length - 3} more performers
        </p>
      )}
    </div>
  );
}
