import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminRepo } from '@/lib/supabase/adminRepo';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const isAdmin = await adminRepo.isCurrentUserAdmin();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-12 border-b border-border flex items-center px-4 justify-between bg-panel">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-semibold">
            Choreo<span className="text-accent">.</span>
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="text-xs text-purple-300 hover:text-purple-200 px-2 py-0.5 rounded border border-purple-500/40"
            >
              ADMIN
            </Link>
          )}
        </div>
        <form action="/api/auth/signout" method="post">
          <button type="submit" className="text-sm text-white/60 hover:text-white">
            Sign out
          </button>
        </form>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
