import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-12 border-b border-border flex items-center px-4 justify-between bg-panel">
        <Link href="/dashboard" className="font-semibold">
          Choreo<span className="text-accent">.</span>
        </Link>
        <form action={signOut}>
          <button className="text-sm text-white/60 hover:text-white">Sign out</button>
        </form>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
