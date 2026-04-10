'use client';

import { useEditorStore } from '@/store/editorStore';

const PALETTE = ['#7c5cff', '#ff5c8a', '#5cffc5', '#ffd65c', '#5cb6ff', '#ff8a5c'];

export function PerformerPanel() {
  const performers = useEditorStore((s) => s.choreo?.performers ?? []);
  const add = useEditorStore((s) => s.addPerformer);
  const remove = useEditorStore((s) => s.removePerformer);

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs uppercase tracking-wider text-white/50">Performers</h2>
        <button
          onClick={() => add()}
          className="text-accent text-sm hover:underline"
        >
          + Add
        </button>
      </div>
      {performers.length === 0 && (
        <p className="text-xs text-white/40">No performers yet.</p>
      )}
      <ul className="space-y-1">
        {performers.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-border/50"
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: p.color || PALETTE[i % PALETTE.length] }}
            />
            <span className="flex-1 truncate">{p.name}</span>
            <button
              onClick={() => remove(p.id)}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
