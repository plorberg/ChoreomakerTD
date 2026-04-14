'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { temporal } from 'zundo';
import {
  type Choreography,
  type Formation,
  type Performer,
  type PerformerState,
  type Vec2,
  createEmptyFormation,
} from '@/domain/choreo';

type ViewMode = '2d' | '3d' | 'split';

interface EditorState {
  choreo: Choreography | null;
  currentFormationId: string | null;
  selectedPerformerIds: string[];
  view: ViewMode;
  isPlaying: boolean;
  playheadSec: number;
  dirty: boolean;

  load: (c: Choreography) => void;
  markClean: () => void;

  setView: (v: ViewMode) => void;

  addFormation: () => void;
  duplicateFormation: (id: string) => void;
  deleteFormation: (id: string) => void;
  selectFormation: (id: string) => void;
  reorderFormations: (fromIdx: number, toIdx: number) => void;
  updateFormationMeta: (
    id: string,
    patch: Partial<Pick<Formation, 'name' | 'notes' | 'timeSec' | 'counts' | 'transitionSec'>>,
  ) => void;

  addPerformer: (name?: string) => void;
  removePerformer: (id: string) => void;
  renamePerformer: (id: string, name: string) => void;
  setPerformerColor: (id: string, color: string) => void;
  movePerformer: (performerId: string, pos: Vec2) => void;
  moveSelectedBy: (delta: Vec2) => void;
  rotatePerformer: (performerId: string, deg: number) => void;
  selectPerformer: (id: string, additive?: boolean) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;

  setAudio: (audio: Choreography['audio']) => void;
  updateStage: (patch: Partial<Choreography['stage']>) => void;

  play: () => void;
  pause: () => void;
  setPlayhead: (sec: number) => void;
}

const PALETTE = [
  '#7c5cff', '#ff5c8a', '#5cffc5', '#ffd65c',
  '#5cb6ff', '#ff8a5c', '#b85cff', '#5cff8a',
];

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * `temporal` (zundo) wraps the store to provide undo/redo history.
 * Only `choreo` is tracked — view/playhead/selection are excluded from
 * history via `partialize`, so undo never steals your selection.
 */
export const useEditorStore = create<EditorState>()(
  subscribeWithSelector(
    temporal(
      immer((set) => ({
        choreo: null,
        currentFormationId: null,
        selectedPerformerIds: [],
        view: '2d',
        isPlaying: false,
        playheadSec: 0,
        dirty: false,

        load: (c) =>
          set((s) => {
            // Migration: old records may carry transitionMs (number, milliseconds).
            // Also: stage may have been rectangular (12×10). Force square by
            // taking the larger dimension.
            const stageSide = Math.round(Math.max(c.stage.width, c.stage.height));
            const migrated = {
              ...c,
              stage: { ...c.stage, width: stageSide, height: stageSide },
              formations: c.formations.map((f) => {
                const legacy = f as Formation & { transitionMs?: number };
                if (legacy.transitionMs != null && f.transitionSec == null) {
                  return { ...f, transitionSec: legacy.transitionMs / 1000 };
                }
                return f;
              }),
            };
            s.choreo = migrated;
            s.currentFormationId = migrated.formations[0]?.id ?? null;
            s.playheadSec = migrated.formations[0]?.timeSec ?? 0;
            s.dirty = false;
          }),
        markClean: () =>
          set((s) => {
            s.dirty = false;
          }),

        setView: (v) =>
          set((s) => {
            s.view = v;
          }),

        addFormation: () =>
          set((s) => {
            if (!s.choreo) return;
            const idx = s.choreo.formations.length;
            const prev = s.choreo.formations[idx - 1];
            const f = createEmptyFormation(idx);
            if (prev) {
              f.states = JSON.parse(JSON.stringify(prev.states));
              f.timeSec = prev.timeSec + (prev.counts ?? 8) * 0.5;
            }
            s.choreo.formations.push(f);
            s.currentFormationId = f.id;
            s.dirty = true;
          }),

        duplicateFormation: (id) =>
          set((s) => {
            if (!s.choreo) return;
            const src = s.choreo.formations.find((f) => f.id === id);
            if (!src) return;
            const copy: Formation = {
              ...JSON.parse(JSON.stringify(src)),
              id: crypto.randomUUID(),
              index: s.choreo.formations.length,
              name: `${src.name} copy`,
              timeSec: src.timeSec + 4,
            };
            s.choreo.formations.push(copy);
            s.currentFormationId = copy.id;
            s.dirty = true;
          }),

        deleteFormation: (id) =>
          set((s) => {
            if (!s.choreo) return;
            s.choreo.formations = s.choreo.formations.filter((f) => f.id !== id);
            s.choreo.formations.forEach((f, i) => {
              f.index = i;
            });
            if (s.currentFormationId === id) {
              s.currentFormationId = s.choreo.formations[0]?.id ?? null;
            }
            s.dirty = true;
          }),

        selectFormation: (id) =>
          set((s) => {
            s.currentFormationId = id;
            const f = s.choreo?.formations.find((x) => x.id === id);
            if (f) s.playheadSec = f.timeSec;
          }),

        reorderFormations: (from, to) =>
          set((s) => {
            if (!s.choreo) return;
            const arr = s.choreo.formations;
            const [moved] = arr.splice(from, 1);
            arr.splice(to, 0, moved);
            arr.forEach((f, i) => {
              f.index = i;
            });
            s.dirty = true;
          }),

        updateFormationMeta: (id, patch) =>
          set((s) => {
            const f = s.choreo?.formations.find((x) => x.id === id);
            if (!f) return;
            Object.assign(f, patch);
            s.dirty = true;
          }),

        addPerformer: (name) =>
          set((s) => {
            if (!s.choreo) return;
            const i = s.choreo.performers.length;

            // Auto-generate "Couple N" by finding the lowest unused number.
            let autoName = name;
            if (!autoName) {
              const usedNumbers = new Set<number>();
              for (const p of s.choreo.performers) {
                const m = /^Couple\s+(\d+)$/.exec(p.name);
                if (m) usedNumbers.add(parseInt(m[1], 10));
              }
              let n = 1;
              while (usedNumbers.has(n)) n++;
              autoName = `Couple ${n}`;
            }

            const color = PALETTE[i % PALETTE.length];
            const p: Performer = {
              id: crypto.randomUUID(),
              name: autoName,
              kind: 'dancer',
              color,
              initials: autoName.startsWith('Couple ')
                ? `C${autoName.slice(7)}`
                : autoName.trim().slice(0, 2).toUpperCase(),
            };
            s.choreo.performers.push(p);

            // Seed position in EVERY formation: place in a row to the right
            // of existing performers, snapped to 0.5m, clamped to stage.
            const half = s.choreo.stage.width / 2;
            for (const f of s.choreo.formations) {
              const n = Object.keys(f.states).length;
              // Continue the "row" layout from createEmptyChoreography.
              const span = s.choreo.stage.width * 0.7;
              const step = span / 7;
              const startX = -span / 2;
              const rawX = startX + step * n;
              const snappedX = Math.round(rawX / 0.5) * 0.5;
              f.states[p.id] = {
                position: {
                  x: clamp(snappedX, -half, half),
                  y: 1,
                },
                rotationDeg: 0,
              };
            }
            s.dirty = true;
          }),

        removePerformer: (id) =>
          set((s) => {
            if (!s.choreo) return;
            s.choreo.performers = s.choreo.performers.filter((p) => p.id !== id);
            for (const f of s.choreo.formations) delete f.states[id];
            s.dirty = true;
          }),

        renamePerformer: (id, name) =>
          set((s) => {
            const p = s.choreo?.performers.find((x) => x.id === id);
            if (!p) return;
            p.name = name;
            p.initials = name.trim().slice(0, 2).toUpperCase();
            s.dirty = true;
          }),

        setPerformerColor: (id, color) =>
          set((s) => {
            const p = s.choreo?.performers.find((x) => x.id === id);
            if (!p) return;
            p.color = color;
            s.dirty = true;
          }),

        movePerformer: (performerId, pos) =>
          set((s) => {
            const f = s.choreo?.formations.find((x) => x.id === s.currentFormationId);
            if (!f) return;
            const st: PerformerState = f.states[performerId] ?? { position: pos, rotationDeg: 0 };
            st.position = pos;
            f.states[performerId] = st;
            s.dirty = true;
          }),

        moveSelectedBy: (delta) =>
          set((s) => {
            if (!s.choreo) return;
            const f = s.choreo.formations.find((x) => x.id === s.currentFormationId);
            if (!f) return;
            const half = s.choreo.stage.width / 2;
            for (const id of s.selectedPerformerIds) {
              const st = f.states[id];
              if (!st) continue;
              const nx = clamp(st.position.x + delta.x, -half, half);
              const ny = clamp(st.position.y + delta.y, -half, half);
              st.position = { x: nx, y: ny };
            }
            s.dirty = true;
          }),

        rotatePerformer: (performerId, deg) =>
          set((s) => {
            const f = s.choreo?.formations.find((x) => x.id === s.currentFormationId);
            if (!f) return;
            const st = f.states[performerId];
            if (st) st.rotationDeg = deg;
            s.dirty = true;
          }),

        selectPerformer: (id, additive = false) =>
          set((s) => {
            if (additive) {
              s.selectedPerformerIds = s.selectedPerformerIds.includes(id)
                ? s.selectedPerformerIds.filter((x) => x !== id)
                : [...s.selectedPerformerIds, id];
            } else {
              s.selectedPerformerIds = [id];
            }
          }),

        setSelection: (ids) =>
          set((s) => {
            s.selectedPerformerIds = ids;
          }),

        clearSelection: () =>
          set((s) => {
            s.selectedPerformerIds = [];
          }),

        setAudio: (audio) =>
          set((s) => {
            if (!s.choreo) return;
            s.choreo.audio = audio;
            s.dirty = true;
          }),

        updateStage: (patch) =>
          set((s) => {
            if (!s.choreo) return;
            // Always keep the stage square AND integer-sized so the meter
            // grid lines fall on whole numbers.
            const next = { ...s.choreo.stage, ...patch };
            if (patch.width != null) {
              const w = Math.round(patch.width);
              next.width = w;
              next.height = w;
            } else if (patch.height != null) {
              const h = Math.round(patch.height);
              next.width = h;
              next.height = h;
            }
            s.choreo.stage = next;
            s.dirty = true;
          }),

        play: () =>
          set((s) => {
            s.isPlaying = true;
          }),
        pause: () =>
          set((s) => {
            s.isPlaying = false;
          }),
        setPlayhead: (sec) =>
          set((s) => {
            s.playheadSec = Math.max(0, sec);
            if (s.choreo) {
              const hit = [...s.choreo.formations]
                .sort((a, b) => a.timeSec - b.timeSec)
                .filter((f) => f.timeSec <= s.playheadSec)
                .pop();
              if (hit) s.currentFormationId = hit.id;
            }
          }),
      })),
      {
        // Only the choreography itself is undoable.
        partialize: (state) => ({ choreo: state.choreo }) as Partial<EditorState>,
        limit: 100,
        equality: (a, b) =>
          (a as { choreo: unknown }).choreo === (b as { choreo: unknown }).choreo,
      },
    ),
  ),
);

export const useCurrentFormation = () =>
  useEditorStore((s) => s.choreo?.formations.find((f) => f.id === s.currentFormationId) ?? null);
