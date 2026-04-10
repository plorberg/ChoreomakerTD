'use client';

import { useEditorStore } from '@/store/editorStore';

export function FormationList() {
  const formations = useEditorStore((s) => s.choreo?.formations ?? []);
  const current = useEditorStore((s) => s.currentFormationId);
  const select = useEditorStore((s) => s.selectFormation);
  const add = useEditorStore((s) => s.addFormation);
  const dup = useEditorStore((s) => s.duplicateFormation);
  const del = useEditorStore((s) => s.deleteFormation);

  return (
    <div className="p-3 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs uppercase tracking-wider text-white/50">Formations</h2>
        <button onClick={add} className="text-accent text-sm hover:underline">
          + Add
        </button>
      </div>
      <ol className="space-y-1">
        {formations.map((f) => (
          <li key={f.id}>
            <div
              className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
                current === f.id
                  ? 'bg-accent/20 border border-accent/50'
                  : 'hover:bg-border/50 border border-transparent'
              }`}
              onClick={() => select(f.id)}
            >
              <span className="text-white/40 text-xs w-5 tabular-nums">{f.index + 1}</span>
              <span className="flex-1 truncate text-sm">{f.name}</span>
              <span className="text-xs text-white/40 tabular-nums">{f.timeSec.toFixed(1)}s</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dup(f.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-xs text-white/50 hover:text-white"
                title="Duplicate"
              >
                ⎘
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${f.name}"?`)) del(f.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300"
                title="Delete"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
