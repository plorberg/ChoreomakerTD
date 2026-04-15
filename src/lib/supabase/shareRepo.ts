import type { Choreography } from '@/domain/choreo';
import { createClient as createServerClient } from './server';
import { createServiceClient } from './serviceClient';

export type ShareRole = 'viewer' | 'editor';

export interface ShareLink {
  token: string;
  choreoId: string;
  role: ShareRole;
  createdAt: string;
}

/**
 * Server repo for share links. Two distinct paths:
 *   - Owner-side ops use the user-scoped client (RLS enforces ownership).
 *   - Token resolution uses the SERVICE client (bypasses RLS, but only
 *     after validating that the token exists).
 */
export const shareRepo = {
  /** List all share links the current user has created for a choreography. */
  async listForChoreo(choreoId: string): Promise<ShareLink[]> {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('share_links')
      .select('token, choreo_id, role, created_at')
      .eq('choreo_id', choreoId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      token: r.token,
      choreoId: r.choreo_id,
      role: r.role as ShareRole,
      createdAt: r.created_at,
    }));
  },

  /** Owner creates a new share link. */
  async create(choreoId: string, role: ShareRole): Promise<ShareLink> {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('share_links')
      .insert({ choreo_id: choreoId, role, created_by: user.id })
      .select('token, choreo_id, role, created_at')
      .single();
    if (error) throw error;
    return {
      token: data.token,
      choreoId: data.choreo_id,
      role: data.role as ShareRole,
      createdAt: data.created_at,
    };
  },

  /** Owner revokes a share link. */
  async revoke(token: string): Promise<void> {
    const supabase = await createServerClient();
    const { error } = await supabase.from('share_links').delete().eq('token', token);
    if (error) throw error;
  },

  /**
   * Resolve a token to (link, choreography). Public — no user auth required.
   * Returns null if token is unknown or the choreo no longer exists.
   */
  async resolve(token: string): Promise<{ link: ShareLink; choreo: Choreography } | null> {
    const svc = createServiceClient();
    const { data: linkRow } = await svc
      .from('share_links')
      .select('token, choreo_id, role, created_at')
      .eq('token', token)
      .maybeSingle();
    if (!linkRow) return null;

    const { data: choreoRow } = await svc
      .from('choreographies')
      .select('data')
      .eq('id', linkRow.choreo_id)
      .maybeSingle();
    if (!choreoRow) return null;

    return {
      link: {
        token: linkRow.token,
        choreoId: linkRow.choreo_id,
        role: linkRow.role as ShareRole,
        createdAt: linkRow.created_at,
      },
      choreo: choreoRow.data as Choreography,
    };
  },

  /**
   * Save a choreography that was opened via a share token. Validates that
   * the token exists AND has editor role before writing.
   */
  async saveViaToken(token: string, choreo: Choreography): Promise<void> {
    const svc = createServiceClient();
    const { data: linkRow } = await svc
      .from('share_links')
      .select('choreo_id, role')
      .eq('token', token)
      .maybeSingle();
    if (!linkRow) throw new Error('Invalid token');
    if (linkRow.role !== 'editor') throw new Error('Read-only token');
    if (linkRow.choreo_id !== choreo.id) throw new Error('Choreo mismatch');

    const updatedAt = new Date().toISOString();
    const { error } = await svc
      .from('choreographies')
      .update({
        title: choreo.title,
        data: { ...choreo, updatedAt },
        updated_at: updatedAt,
      })
      .eq('id', choreo.id);
    if (error) throw error;
  },
};
