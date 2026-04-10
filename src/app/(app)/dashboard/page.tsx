import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { choreoRepoServer } from '@/lib/supabase/choreoRepo.server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const items = await choreoRepoServer.listForUser(user.id);
  const { error } = await searchParams;

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

      {items.length === 0 ? (
        <p className="text-white/50">No choreographies yet. Create your first one.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <li key={c.id} className="relative group">
              <Link
                href={`/editor/${c.id}`}
                className="block bg-panel border border-border rounded-lg p-4 hover:border-accent transition"
              >
                <div className="font-medium truncate pr-8">{c.title}</div>
                <div className="text-xs text-white/50 mt-1">
                  Updated {new Date(c.updated_at).toLocaleString()}
                </div>
              </Link>
              <form
                action="/api/choreos/delete"
                method="post"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
              >
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  className="text-red-400 hover:text-red-300 text-lg px-2"
                  title="Delete"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
