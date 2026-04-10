import 'server-only';

import type { Choreography } from '@/domain/choreo';
import { createClient } from './server';

export const choreoRepoServer = {
  async listForUser(userId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('choreographies')
      .select('id, title, updated_at')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async get(id: string): Promise<Choreography | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('choreographies')
      .select('data')
      .eq('id', id)
      .single();

    if (error) return null;
    return data?.data as Choreography;
  },

  async delete(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
      .from('choreographies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};