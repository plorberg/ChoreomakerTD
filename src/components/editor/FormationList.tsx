'use client';

import { useState } from 'react';
import { useEditorStore, useOrderedFormations } from '@/store/editorStore';
import { formatTime } from '@/lib/format/time';

/**
 * Drag-and-drop reordering policy:
 *   - Order in the list is determined by `timeSec` (always).
 *   - Dragging a formation between two others sets its new `timeSec` to the
 *     midpoint between the neighbors. Dragging to the top or bottom places
 *     it 4s before the first or after the last.
 *   - Dragging an item onto its own current position is a no-op.
 *
 * This means: the user moves bilder around freely, the timing
 * automatically settles into a sensible default. They can fine-tune the
 * exact `timeSec` afterward in the NotesPanel.
 */
export function FormationList() {
  const formations = useOrderedFormations();
  const current = useEditorStore((s) => s.currentFormationId);
  const select = useEditorStore((s) => s.selectFormation);
  const add = useEditorStore((s) => s.addFormation);
  const dup = useEditorStore((s) => s.duplicateFormation);
  const del = useEditorStore((s) => s.deleteFormation);
  const setTime = useEditorStore((s) => s.setFormationTime);
  const readOnly = useEditorStore((s) => s.readOnly);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragOverSide, setDragOverSide] = useState<'before' | 'after'>('before');

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const side: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    if (dragOverIdx !== idx || dragOverSide !== side) {
      setDragOverIdx(idx);
      setDragOverSide(side);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (!dragId) return;
    const dragged = formations.find((f) => f.id === dragId);
    if (!dragged) {
      setDragId(null);
      setDragOverIdx(null);
      return;
    }

    // Compute the slot the user wants the dragged item to occupy in the
    // SORTED-BY-TIME list (without the dragged item).
    const others = formations.filter((f) => f.id !== dragId);
    let slot = dragOverSide === 'after' ? idx + 1 : idx;
    // Adjust because `idx` was an index into the full list (with dragged
    // item still there). If the dragged item came before the target, the
    // slot in `others` shifts down by one.
    const draggedOrigIdx = formations.findIndex((f) => f.id === dragId);
    if (draggedOrigIdx !== -1 && draggedOrigIdx < slot) slot -= 1;
    if (slot < 0) slot = 0;
    if (slot > others.length) slot = others.length;

    // Compute the new timeSec based on the neighbors at this slot.
    const before = others[slot - 1] ?? null;
    const after = others[slot] ?? null;

    let newTime: number;
    if (!before && !after) {
      // Only one formation; nothing to do.
      newTime = dragged.timeSec;
    } else if (!before && after) {
      // Drop at the very top — place 4s before the first.
      newTime = Math.max(0, after.timeSec - 4);
    } else if (before && !after) {
      // Drop at the very bottom — place 4s after the last.
      newTime = before.timeSec + 4;
    } else if (before && after) {
      // Between two — midpoint.
      newTime = before.timeSec + (after.timeSec - before.timeSec) / 2;
    } else {
      newTime = dragged.timeSec;
    }

    // Skip if effectively no-op (within 0.05s)
    if (Math.abs(newTime - dragged.timeSec) > 0.05) {
      setTime(dragId, newTime);
    }
    setDragId(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverIdx(null);
  };

  return (
    <div className="p-3 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs uppercase tracking-wider text-white/50">Formations</h2>
        {!readOnly && (
          <button onClick={add} className="text-accent text-sm hover:underline">
            + Add
          </button>
        )}
      </div>

      <ol className="space-y-1">
        {formations.map((f, idx) => {
          const isDragging = dragId === f.id;
          const showAbove = dragOverIdx === idx && dragOverSide === 'before' && !isDragging;
          const showBelow = dragOverIdx === idx && dragOverSide === 'after' && !isDragging;
          return (
            <li
              key={f.id}
              draggable={!readOnly}
              onDragStart={!readOnly ? (e) => handleDragStart(e, f.id) : undefined}
              onDragOver={!readOnly ? (e) => handleDragOver(e, idx) : undefined}
              onDragLeave={!readOnly ? handleDragLeave : undefined}
              onDrop={!readOnly ? (e) => handleDrop(e, idx) : undefined}
              onDragEnd={!readOnly ? handleDragEnd : undefined}
              className="relative"
            >
              {showAbove && (
                <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-accent rounded-full pointer-events-none z-10" />
              )}
              <div
                className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
                  isDragging ? 'opacity-40' : ''
                } ${
                  current === f.id
                    ? 'bg-accent/20 border border-accent/50'
                    : 'hover:bg-border/50 border border-transparent'
                }`}
                onClick={() => select(f.id)}
              >
                {!readOnly && (
                  <span
                    className="text-white/30 text-xs select-none cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⋮⋮
                  </span>
                )}
                <span className="text-white/40 text-xs w-5 tabular-nums">{idx + 1}</span>
                <span className="flex-1 truncate text-sm">{f.name}</span>
                <span className="text-xs text-white/40 tabular-nums">{formatTime(f.timeSec)}</span>

                {!readOnly && (
                  <>
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
                  </>
                )}
              </div>
              {showBelow && (
                <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-accent rounded-full pointer-events-none z-10" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
