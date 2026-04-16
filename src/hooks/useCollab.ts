'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useEditorStore } from '@/store/editorStore';
import type { Choreography } from '@/domain/choreo';

/**
 * Realtime collaboration for the editor.
 *
 * Architecture:
 *   One Supabase Realtime channel per choreography, `choreo:${id}`.
 *   Every participant joins as a "presence" so we know who's currently
 *   in the editor. Changes are broadcast via explicit events:
 *     - `choreo-update`   { choreo, sender } → apply to store
 *     - `cursor`          { x, y, sender }   → render remote cursor
 *
 * Anti-echo:
 *   Each client picks a random `clientId` on mount. Broadcasts include
 *   it as `sender`; when we receive our own sender back, we drop it.
 *
 * Ownership & throttling:
 *   - Choreo updates are sent on every store mutation, debounced ~150ms.
 *     That's fast enough to feel live, slow enough to not flood the wire
 *     during a drag that touches the store ~60 times/sec.
 *   - Cursor updates are throttled to 20Hz.
 *
 * Conflict handling:
 *   No OT/CRDT. Last writer wins — acceptable for choreo scenarios where
 *   users typically work on different formations. When a remote update
 *   arrives while we're mid-drag (interaction flag set via `setIsDragging`),
 *   we queue it and apply once the drag ends.
 */

export interface CollabUser {
  clientId: string;
  email: string;
  displayName: string;
  color: string;
}

export interface RemoteCursor {
  clientId: string;
  email: string;
  displayName: string;
  color: string;
  x: number; // stage coords (meters)
  y: number;
  t: number; // Date.now() of last update — for idle-fade
}

interface Props {
  choreoId: string;
  currentUser: { email: string; displayName: string };
}

// A small palette used to color-assign users deterministically-ish
const COLORS = [
  '#f97316', // orange
  '#22c55e', // green
  '#3b82f6', // blue
  '#ef4444', // red
  '#a855f7', // purple
  '#eab308', // yellow
  '#14b8a6', // teal
  '#ec4899', // pink
];

function colorForClient(clientId: string): string {
  let h = 0;
  for (let i = 0; i < clientId.length; i++) h = (h * 31 + clientId.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

// --- Module-globals for drag coordination ---------------------------------
// Other code (Stage2D) flips this while a pointer-drag is in progress so
// we don't clobber the user's current manipulation with a remote update.

let dragInProgress = false;
export function setCollabDragInProgress(v: boolean) {
  dragInProgress = v;
}

// Pending remote to apply after drag ends
let queuedRemote: Choreography | null = null;

// --- Module-globals for outgoing cursor -----------------------------------
// Stage2D calls broadcastCursor(x,y) from its pointer-move handler. We
// funnel through the module so the Stage doesn't need to know about the
// channel.
let broadcastCursorImpl: ((x: number, y: number) => void) | null = null;
export function broadcastCursor(x: number, y: number) {
  broadcastCursorImpl?.(x, y);
}

// --- Hook ----------------------------------------------------------------

export function useCollab({ choreoId, currentUser }: Props) {
  const [peers, setPeers] = useState<CollabUser[]>([]);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const clientIdRef = useRef<string>('');
  if (!clientIdRef.current) clientIdRef.current = crypto.randomUUID();

  useEffect(() => {
    // Empty choreoId → caller is explicitly disabling collab (e.g. an
    // anonymous share-link visitor). Skip the subscription entirely.
    if (!choreoId) return;
    const supabase = createClient();
    const clientId = clientIdRef.current;
    const channel = supabase.channel(`choreo:${choreoId}`, {
      config: {
        presence: { key: clientId },
        broadcast: { self: false, ack: false },
      },
    });

    // --- Presence ---
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{
        email: string;
        displayName: string;
        color: string;
      }>();
      const list: CollabUser[] = [];
      for (const cid in state) {
        const entry = state[cid][0];
        if (!entry) continue;
        list.push({
          clientId: cid,
          email: entry.email,
          displayName: entry.displayName,
          color: entry.color,
        });
      }
      setPeers(list);
    });

    // --- Remote choreo update ---
    channel.on('broadcast', { event: 'choreo-update' }, ({ payload }) => {
      const msg = payload as { choreo: Choreography; sender: string };
      if (msg.sender === clientId) return;
      if (dragInProgress) {
        // Queue; apply after the drag ends
        queuedRemote = msg.choreo;
        return;
      }
      useEditorStore.getState().applyRemoteChoreo(msg.choreo);
    });

    // --- Remote cursor ---
    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      const msg = payload as {
        sender: string;
        email: string;
        displayName: string;
        color: string;
        x: number;
        y: number;
      };
      if (msg.sender === clientId) return;
      setCursors((prev) => ({
        ...prev,
        [msg.sender]: {
          clientId: msg.sender,
          email: msg.email,
          displayName: msg.displayName,
          color: msg.color,
          x: msg.x,
          y: msg.y,
          t: Date.now(),
        },
      }));
    });

    const myColor = colorForClient(clientId);

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          email: currentUser.email,
          displayName: currentUser.displayName,
          color: myColor,
        });
      }
    });

    // Broadcast cursor positions (throttled)
    let lastCursorSend = 0;
    broadcastCursorImpl = (x, y) => {
      const now = performance.now();
      if (now - lastCursorSend < 50) return; // 20Hz cap
      lastCursorSend = now;
      channel.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          sender: clientId,
          email: currentUser.email,
          displayName: currentUser.displayName,
          color: myColor,
          x,
          y,
        },
      });
    };

    // --- Outgoing choreo updates on store mutation ---
    let outgoingTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubStore = useEditorStore.subscribe(
      (s) => s.choreo,
      (choreo) => {
        if (!choreo) return;
        // Only broadcast if local user caused the change — after applying a
        // remote update, dirty stays false until the user mutates again.
        if (!useEditorStore.getState().dirty) return;
        if (outgoingTimer) clearTimeout(outgoingTimer);
        outgoingTimer = setTimeout(() => {
          channel.send({
            type: 'broadcast',
            event: 'choreo-update',
            payload: { sender: clientId, choreo },
          });
        }, 150);
      },
    );

    // --- Cursor idle-fade cleanup: remove cursors older than 5s ---
    const cleanupId = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        const out: Record<string, RemoteCursor> = {};
        for (const cid in prev) {
          if (now - prev[cid].t < 5000) out[cid] = prev[cid];
        }
        return out;
      });
    }, 2000);

    // --- Drain queued remote update after drag ends ---
    const drainId = setInterval(() => {
      if (!dragInProgress && queuedRemote) {
        const toApply = queuedRemote;
        queuedRemote = null;
        useEditorStore.getState().applyRemoteChoreo(toApply);
      }
    }, 100);

    return () => {
      unsubStore();
      if (outgoingTimer) clearTimeout(outgoingTimer);
      clearInterval(cleanupId);
      clearInterval(drainId);
      broadcastCursorImpl = null;
      supabase.removeChannel(channel);
    };
  }, [choreoId, currentUser.email, currentUser.displayName]);

  return {
    peers,
    cursors,
    myClientId: clientIdRef.current,
  };
}
