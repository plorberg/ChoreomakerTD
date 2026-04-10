'use client';

import type { Performer } from '@/domain/choreo';
import { useEditorStore } from '@/store/editorStore';

const EMPTY_PERFORMERS: Performer[] = [];

export function PerformerPanel() {
  const performers = useEditorStore((s) => s.choreo?.performers ?? EMPTY_PERFORMERS);
  const add = useEditorStore((s) => s.addPerformer);
  const remove = useEditorStore((s) => s.removePerformer);

  return (
    <div className="p-3 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs uppercase tracking-wider text-white/50">Performers</h2>
        <button onClick={() => add()} className="text-accent text-sm hover:underline">
          + Add
        </button>
      </div>

      <ul className="space-y-1">
        {performers.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded border border-transparent hover:bg-border/50"
          >
            <span
              className="inline-block w-3 h-3 rounded-full border border-white/20"
              style={{ backgroundColor: p.color }}
            />
            <span className="flex-1 truncate text-sm">{p.name}</span>
            <button
              onClick={() => remove(p.id)}
              className="text-xs text-red-400 hover:text-red-300"
              title="Remove"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}