/**
 * Choreo Domain Model
 * -------------------
 * Single source of truth. Used by:
 *   - 2D editor (react-konva)
 *   - 3D preview (react-three-fiber)
 *   - Zustand editor store
 *   - Supabase persistence (JSON column on choreographies.data)
 *   - PDF export
 *
 * Coordinate system:
 *   - Stage is a rectangle in *stage units* (meters), origin at center.
 *   - stage.width = X extent, stage.height = Z extent (depth).
 *   - 2D view maps (x, y) -> (stage_x, stage_z).
 *   - 3D view places dancers at (x, 0, y) so 2D plan matches top-down 3D.
 */

export type ID = string;
export type Seconds = number;

export interface Vec2 { x: number; y: number }
export interface Vec3 { x: number; y: number; z: number }

// ---------- User & Account ----------

export type PlanTier = 'free' | 'pro' | 'team';

export interface UserProfile {
  id: ID;                // == supabase auth.users.id
  email: string;
  displayName: string | null;
  createdAt: string;     // ISO
}

export interface Subscription {
  userId: ID;
  tier: PlanTier;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
}

/** Feature flags resolved from the user's current subscription. */
export interface Entitlements {
  maxChoreographies: number;      // -1 = unlimited
  maxFormationsPerChoreo: number;
  canExportPdf: boolean;
  canUseAudio: boolean;
  canUse3DPreview: boolean;
  canCollaborate: boolean;
  watermarkOnExport: boolean;
}

// ---------- Stage ----------

export interface Stage {
  /**
   * Stage edge length in meters. The stage is always square — `width` and
   * `height` are kept equal by the editor and migrations.
   * (Both fields exist for back-compat with persisted records.)
   */
  width: number;
  height: number;
  shape: 'rect' | 'circle';
  backgroundColor?: string;
}

// ---------- Performers ----------

export type PerformerKind = 'dancer' | 'prop' | 'group';

export interface Performer {
  id: ID;
  name: string;
  kind: PerformerKind;
  color: string;       // hex, used in 2D & 3D
  initials?: string;   // shown on the token
}

// ---------- Formation (a.k.a. "Picture") ----------

export interface PerformerState {
  position: Vec2;       // on the stage plane
  rotationDeg: number;  // facing direction, 0 = +Y (upstage)
}

export interface Formation {
  id: ID;
  index: number;                 // order in the choreography
  name: string;
  /** Absolute time in seconds when this formation must be reached. */
  timeSec: Seconds;
  /**
   * Duration of the transition INTO this formation.
   * Movement starts at (timeSec - transitionSec); before that, performers
   * stay at the previous formation. Defaults to 2s when missing.
   */
  transitionSec?: Seconds;
  /** Per-performer state keyed by performer id. Performers missing = absent. */
  states: Record<ID, PerformerState>;
  notes: string;                 // markdown allowed
  counts?: number;               // musical counts (e.g. 8)
}

// ---------- Audio ----------

export interface AudioTrack {
  id: ID;
  name: string;
  /** Supabase Storage path, or blob URL in local-only mode. */
  storagePath: string | null;
  durationSec: Seconds;
  bpm?: number;
}

export interface Cue {
  id: ID;
  timeSec: Seconds;
  label: string;
  color?: string;
}

// ---------- Choreography (root aggregate) ----------

export interface Choreography {
  id: ID;
  ownerId: ID;
  title: string;
  description?: string;
  stage: Stage;
  performers: Performer[];
  formations: Formation[];
  audio: AudioTrack | null;
  cues: Cue[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
}

// ---------- Factory helpers ----------

import { v4 as uuid } from 'uuid';

// Eight evenly spaced colors around the hue circle for the default couples.
const DEFAULT_COUPLE_COLORS = [
  '#7c5cff', // purple
  '#ff5c8a', // pink
  '#5cffc5', // mint
  '#ffd65c', // amber
  '#5cb6ff', // sky
  '#ff8a5c', // coral
  '#b85cff', // violet
  '#5cff8a', // green
];

export const createEmptyChoreography = (ownerId: ID, title = 'Untitled'): Choreography => {
  const id = uuid();
  const stage: Stage = { width: 16, height: 16, shape: 'rect', backgroundColor: '#c89968' };

  // Seed 8 couples in a single row, evenly spaced across the stage width,
  // a little in front of center so they're clearly visible to the audience.
  const performers: Performer[] = Array.from({ length: 8 }, (_, i) => {
    const name = `Couple ${i + 1}`;
    return {
      id: uuid(),
      name,
      kind: 'dancer',
      color: DEFAULT_COUPLE_COLORS[i],
      initials: `C${i + 1}`,
    };
  });

  // Row layout: span 70% of the stage width, centered at y = 1 (slightly downstage).
  const span = stage.width * 0.7;
  const step = span / (performers.length - 1);
  const startX = -span / 2;
  const rowY = 1;
  const positions: Record<ID, PerformerState> = {};
  performers.forEach((p, i) => {
    positions[p.id] = {
      position: { x: Math.round((startX + step * i) * 2) / 2, y: rowY },
      rotationDeg: 0,
    };
  });

  const opening = createEmptyFormation(0, 'Opening');
  opening.states = positions;

  return {
    id,
    ownerId,
    title,
    stage,
    performers,
    formations: [opening],
    audio: null,
    cues: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 1,
  };
};

export const createEmptyFormation = (index: number, name = `Formation ${index + 1}`): Formation => ({
  id: uuid(),
  index,
  name,
  timeSec: index * 8,
  states: {},
  notes: '',
  counts: 8,
  transitionSec: 2,
});

export const createPerformer = (name: string, color = '#7c5cff'): Performer => ({
  id: uuid(),
  name,
  kind: 'dancer',
  color,
  initials: name.slice(0, 2).toUpperCase(),
});
