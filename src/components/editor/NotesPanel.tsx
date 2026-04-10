'use client';

import { useCurrentFormation, useEditorStore } from '@/store/editorStore';

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

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-white/60">
          Time (s)
          <input
            type="number"
            step="0.1"
            min="0"
            className="w-full mt-1 bg-bg border border-border rounded px-2 py-1.5 text-sm tabular-nums"
            value={formation.timeSec}
            onChange={(e) => update(formation.id, { timeSec: parseFloat(e.target.value) || 0 })}
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
