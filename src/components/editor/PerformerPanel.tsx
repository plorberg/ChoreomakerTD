'use client';

import { useEffect, useRef, useState } from 'react';
import type { Performer } from '@/domain/choreo';
import { useEditorStore } from '@/store/editorStore';

const EMPTY: Performer[] = [];

export function PerformerPanel() {
  const performers = useEditorStore((s) => s.choreo?.performers ?? EMPTY);
  const add = useEditorStore((s) => s.addPerformer);
  const remove = useEditorStore((s) => s.removePerformer);
  const rename = useEditorStore((s) => s.renamePerformer);
  const setColor = useEditorStore((s) => s.setPerformerColor);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  const startEdit = (p: Performer) => {
    setEditingId(p.id);
    setDraft(p.name);
  };

  const commit = () => {
    if (editingId && draft.trim()) rename(editingId, draft.trim());
    setEditingId(null);
  };

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
            className="flex items-center gap-2 px-2 py-1.5 rounded border border-transparent hover:bg-border/50 group"
          >
            <label className="relative cursor-pointer" title="Change color">
              <span
                className="inline-block w-3 h-3 rounded-full border border-white/20"
                style={{ backgroundColor: p.color }}
              />
              <input
                type="color"
                value={p.color}
                onChange={(e) => setColor(p.id, e.target.value)}
                className="absolute inset-0 opacity-0 w-3 h-3 cursor-pointer"
              />
            </label>

            {editingId === p.id ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="flex-1 bg-bg border border-accent rounded px-1.5 py-0.5 text-sm outline-none"
              />
            ) : (
              <button
                onDoubleClick={() => startEdit(p)}
                onClick={(e) => {
                  // double-click to rename, single click selects in store
                  if (e.detail === 2) startEdit(p);
                }}
                title="Double-click to rename"
                className="flex-1 truncate text-sm text-left"
              >
                {p.name}
              </button>
            )}

            <button
              onClick={() => startEdit(p)}
              className="text-xs text-white/40 hover:text-white opacity-0 group-hover:opacity-100"
              title="Rename"
            >
              ✎
            </button>
            <button
              onClick={() => {
                if (confirm(`Remove "${p.name}"?`)) remove(p.id);
              }}
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
