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
