import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { choreoRepoServer } from '@/lib/supabase/choreoRepo.server';
import { ChoreoCard } from './ChoreoCard';
import type { ShareLink, ShareRole } from '@/lib/supabase/shareRepo';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; share?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const items = await choreoRepoServer.listForUser(user.id);
  const { error, share: shareIdParam } = await searchParams;

  // Bulk-fetch all share links the user owns so we don't N+1 per card.
  const { data: linkRows } = await supabase
    .from('share_links')
    .select('token, choreo_id, role, created_at')
    .order('created_at', { ascending: false });

  const linksByChoreo = new Map<string, ShareLink[]>();
  for (const row of linkRows ?? []) {
    const list = linksByChoreo.get(row.choreo_id) ?? [];
    list.push({
      token: row.token,
      choreoId: row.choreo_id,
      role: row.role as ShareRole,
      createdAt: row.created_at,
    });
    linksByChoreo.set(row.choreo_id, list);
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your choreographies</h1>
        <form action="/api/choreos" method="post">
          <button
            type="submit"
            className="bg-accent px-4 py-2 rounded-lg font-medium"
          >
            + New
          </button>
        </form>
      </div>

      {error === 'limit' && (
        <div className="mb-4 p-3 border border-red-500/40 bg-red-500/10 rounded text-sm text-red-300">
          You&apos;ve hit the free-tier limit. Upgrade to create more.
        </div>
      )}
      {error === 'create' && (
        <div className="mb-4 p-3 border border-red-500/40 bg-red-500/10 rounded text-sm text-red-300">
          Could not create choreography. Try again.
        </div>
      )}
      {error === 'rename' && (
        <div className="mb-4 p-3 border border-red-500/40 bg-red-500/10 rounded text-sm text-red-300">
          Could not rename. Try again.
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-white/50">No choreographies yet. Create your first one.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <ChoreoCard
              key={c.id}
              id={c.id}
              title={c.title}
              updatedAt={c.updated_at}
              shareLinks={linksByChoreo.get(c.id) ?? []}
              initiallyOpenShare={shareIdParam === c.id}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
