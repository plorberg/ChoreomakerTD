import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { choreoRepo } from '@/lib/supabase/choreoRepo';
import { createEmptyChoreography } from '@/domain/choreo';
import { resolveEntitlements, assertEntitlement } from '@/lib/licensing/entitlements';

async function createChoreoAction() {
  'use server';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const ent = resolveEntitlements(sub as any);
  const { count } = await supabase
    .from('choreographies')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id);

  assertEntitlement(ent, 'maxChoreographies', count ?? 0);

  const c = createEmptyChoreography(user.id, 'New choreography');
  await supabase.from('choreographies').insert({
    id: c.id,
    owner_id: user.id,
    title: c.title,
    data: c,
  });
  redirect(`/editor/${c.id}`);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const items = await choreoRepo.listForUser(user!.id);

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your choreographies</h1>
        <form action={createChoreoAction}>
          <button className="bg-accent px-4 py-2 rounded-lg font-medium">+ New</button>
        </form>
      </div>
      {items.length === 0 ? (
        <p className="text-white/50">No choreographies yet. Create your first one.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/editor/${c.id}`}
                className="block bg-panel border border-border rounded-lg p-4 hover:border-accent transition"
              >
                <div className="font-medium truncate">{c.title}</div>
                <div className="text-xs text-white/50 mt-1">
                  Updated {new Date(c.updated_at).toLocaleString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
