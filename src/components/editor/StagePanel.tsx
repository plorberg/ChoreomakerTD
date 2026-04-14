'use client';

import { useEditorStore } from '@/store/editorStore';

const FLOOR_PRESETS = [
  { label: 'Parquet', color: '#c89968' },
  { label: 'Maple', color: '#e2b97f' },
  { label: 'Walnut', color: '#7a4a2a' },
  { label: 'Marley black', color: '#1a1a1a' },
  { label: 'Marley grey', color: '#4a4a4a' },
];

const SIZE_PRESETS = [10, 12, 14, 16, 18, 20];

export function StagePanel() {
  const stage = useEditorStore((s) => s.choreo?.stage);
  const updateStage = useEditorStore((s) => s.updateStage);

  if (!stage) return null;

  const setSize = (n: number) => updateStage({ width: n }); // store mirrors to height

  return (
    <div className="p-3 border-b border-border">
      <h2 className="text-xs uppercase tracking-wider text-white/50 mb-2">Stage</h2>

      <label className="block text-xs text-white/60 mb-2">
        Size (m × m)
        <div className="flex items-center gap-2 mt-1">
          <input
            type="number"
            min={4}
            max={40}
            step={1}
            value={stage.width}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 4 && v <= 40) setSize(v);
            }}
            className="w-20 bg-bg border border-border rounded px-2 py-1 text-sm tabular-nums"
          />
          <span className="text-white/40 text-xs">×</span>
          <input
            type="number"
            value={stage.width}
            disabled
            className="w-20 bg-bg/50 border border-border rounded px-2 py-1 text-sm tabular-nums opacity-50"
          />
          <span className="text-white/40 text-xs">m</span>
        </div>
      </label>

      <div className="flex flex-wrap gap-1 mb-3">
        {SIZE_PRESETS.map((n) => (
          <button
            key={n}
            onClick={() => setSize(n)}
            className={`text-xs px-2 py-1 rounded border ${
              stage.width === n
                ? 'border-accent bg-accent/20 text-white'
                : 'border-border text-white/60 hover:border-white/40'
            }`}
          >
            {n}m
          </button>
        ))}
      </div>

      <div className="text-xs text-white/60 mb-1">Floor</div>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="color"
          value={stage.backgroundColor ?? '#c89968'}
          onChange={(e) => updateStage({ backgroundColor: e.target.value })}
          className="w-8 h-8 rounded border border-border bg-transparent cursor-pointer"
        />
        <input
          type="text"
          value={stage.backgroundColor ?? '#c89968'}
          onChange={(e) => updateStage({ backgroundColor: e.target.value })}
          className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs font-mono"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {FLOOR_PRESETS.map((preset) => (
          <button
            key={preset.color}
            onClick={() => updateStage({ backgroundColor: preset.color })}
            title={preset.label}
            className="w-6 h-6 rounded border border-border hover:border-white"
            style={{ background: preset.color }}
          />
        ))}
      </div>
    </div>
  );
}
