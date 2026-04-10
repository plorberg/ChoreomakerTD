import type { Choreography } from '@/domain/choreo';
import { createClient as createServerClient } from './server';
import { createClient as createBrowserClient } from './client';

/**
 * Table: public.choreographies
 *   id          uuid PK
 *   owner_id    uuid references auth.users
 *   title       text
 *   data        jsonb  -- serialized Choreography
 *   updated_at  timestamptz
 *
 * We store the full aggregate as JSONB. This keeps the editor fast
 * (one read, one write) and lets the schema evolve via schemaVersion.
 * If relational querying becomes important later, introduce a
 * `formations` table without breaking the JSONB path.
 */

export const choreoRepo = {
  async listForUser(userId: string) {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('choreographies')
      .select('id, title, updated_at')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async get(id: string): Promise<Choreography | null> {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('choreographies')
      .select('data')
      .eq('id', id)
      .single();
    if (error) return null;
    return data?.data as Choreography;
  },

  // Client-side save (called from the editor)
  async saveFromClient(choreo: Choreography) {
    const supabase = createBrowserClient();
    const payload = { ...choreo, updatedAt: new Date().toISOString() };
    const { error } = await supabase.from('choreographies').upsert({
      id: choreo.id,
      owner_id: choreo.ownerId,
      title: choreo.title,
      data: payload,
      updated_at: payload.updatedAt,
    });
    if (error) throw error;
    return payload;
  },

  async delete(id: string) {
    const supabase = await createServerClient();
    const { error } = await supabase.from('choreographies').delete().eq('id', id);
    if (error) throw error;
  },
};
