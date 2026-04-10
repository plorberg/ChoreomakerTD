'use client';

import type { Choreography } from '@/domain/choreo';
import { createClient } from './client';

export const choreoRepoClient = {
  async save(choreo: Choreography) {
    const supabase = createClient();
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
};