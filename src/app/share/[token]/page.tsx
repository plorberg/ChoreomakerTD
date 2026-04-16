import { notFound } from 'next/navigation';
import { shareRepo } from '@/lib/supabase/shareRepo';
import { createClient } from '@/lib/supabase/server';
import { ShareEditorShell } from './ShareEditorShell';

export const dynamic = 'force-dynamic';

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await shareRepo.resolve(token);
  if (!result) notFound();

  // Pick up the current user IF logged in. Anonymous share-link visitors
  // get no collab presence (per product spec: only registered users
  // participate in realtime collaboration).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentUser: { email: string; displayName: string } | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    const displayName =
      profile?.display_name?.trim() || user.email?.split('@')[0] || 'Anon';
    currentUser = {
      email: user.email ?? '(no email)',
      displayName,
    };
  }

  return (
    <ShareEditorShell
      initialChoreo={result.choreo}
      role={result.link.role}
      token={result.link.token}
      currentUser={currentUser}
    />
  );
}
