import { redirect } from 'next/navigation';
import Link from 'next/link';
import { adminRepo } from '@/lib/supabase/adminRepo';
import { FormattedDate } from '@/components/ui/FormattedDate';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const isAdmin = await adminRepo.isCurrentUserAdmin();
  if (!isAdmin) redirect('/dashboard');

  const [users, choreos] = await Promise.all([
    adminRepo.listUsers(),
    adminRepo.listAllChoreos(),
  ]);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-sm text-white/50 mt-1">
            {users.length} users · {choreos.length} choreographies
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-white/60 hover:text-white">
          ← Back to dashboard
        </Link>
      </div>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-white/50 mb-3">Users</h2>
        <div className="bg-panel border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg/50 text-xs uppercase text-white/50">
              <tr>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Display name</th>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-right px-3 py-2">Choreos</th>
                <th className="text-right px-3 py-2">Shares</th>
                <th className="text-left px-3 py-2">Created</th>
                <th className="text-right px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-3 py-2">{u.displayName ?? <span className="text-white/30">—</span>}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        u.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{u.choreoCount}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{u.shareLinkCount}</td>
                  <td className="px-3 py-2 text-xs text-white/50">
                    <FormattedDate iso={u.createdAt} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <form action="/api/admin/set-role" method="post" className="inline">
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        type="hidden"
                        name="role"
                        value={u.role === 'admin' ? 'user' : 'admin'}
                      />
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 rounded border border-border hover:border-accent"
                      >
                        {u.role === 'admin' ? 'Demote' : 'Promote to admin'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-white/50 mb-3">All choreographies</h2>
        <div className="bg-panel border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg/50 text-xs uppercase text-white/50">
              <tr>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Owner</th>
                <th className="text-left px-3 py-2">Updated</th>
                <th className="text-right px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {choreos.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link href={`/editor/${c.id}`} className="hover:text-accent">
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-white/60">{c.ownerEmail}</td>
                  <td className="px-3 py-2 text-xs text-white/50">
                    <FormattedDate iso={c.updatedAt} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <form action="/api/admin/delete-choreo" method="post" className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
