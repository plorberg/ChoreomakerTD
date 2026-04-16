import 'server-only';
import { createClient } from './server';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  role: 'user' | 'admin';
  createdAt: string;
  choreoCount: number;
  shareLinkCount: number;
}

export interface AdminChoreo {
  id: string;
  title: string;
  ownerId: string;
  ownerEmail: string;
  updatedAt: string;
}

export const adminRepo = {
  /**
   * True if the current session belongs to an admin. Returns false if not
   * logged in or if the role is not 'admin'.
   */
  async isCurrentUserAdmin(): Promise<boolean> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    return data?.role === 'admin';
  },

  async listUsers(): Promise<AdminUser[]> {
    const supabase = await createClient();
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Tally choreographies and share links per user
    const { data: choreoRows } = await supabase
      .from('choreographies')
      .select('owner_id');
    const { data: linkRows } = await supabase
      .from('share_links')
      .select('created_by');

    const choreoCounts = new Map<string, number>();
    for (const r of choreoRows ?? []) {
      choreoCounts.set(r.owner_id, (choreoCounts.get(r.owner_id) ?? 0) + 1);
    }
    const linkCounts = new Map<string, number>();
    for (const r of linkRows ?? []) {
      linkCounts.set(r.created_by, (linkCounts.get(r.created_by) ?? 0) + 1);
    }

    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      displayName: p.display_name,
      role: p.role as 'user' | 'admin',
      createdAt: p.created_at,
      choreoCount: choreoCounts.get(p.id) ?? 0,
      shareLinkCount: linkCounts.get(p.id) ?? 0,
    }));
  },

  async listAllChoreos(): Promise<AdminChoreo[]> {
    const supabase = await createClient();
    // We don't rely on PostgREST's FK-embed (`profiles!...(email)`) because
    // choreographies.owner_id → auth.users.id, and the profiles row is
    // joined via its own PK also pointing at auth.users.id — there's no
    // direct FK between choreographies and profiles that PostgREST can
    // autodetect. Manual two-step join is simpler and always works.
    const { data: rows, error } = await supabase
      .from('choreographies')
      .select('id, title, owner_id, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const ownerIds = Array.from(new Set((rows ?? []).map((r) => r.owner_id)));
    const emailById = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', ownerIds);
      for (const p of profs ?? []) emailById.set(p.id, p.email);
    }

    return (rows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      ownerId: r.owner_id,
      ownerEmail: emailById.get(r.owner_id) ?? '(unknown)',
      updatedAt: r.updated_at,
    }));
  },

  /** Promote / demote a user. */
  async setRole(userId: string, role: 'user' | 'admin'): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);
    if (error) throw error;
  },
};
