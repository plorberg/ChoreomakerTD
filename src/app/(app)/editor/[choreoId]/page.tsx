import { notFound, redirect } from 'next/navigation';
import { choreoRepoServer } from '@/lib/supabase/choreoRepo.server';
import { createClient } from '@/lib/supabase/server';
import { EditorShell } from '@/components/layout/EditorShell';

export default async function EditorPage({
  params,
}: {
  params: Promise<{ choreoId: string }>;
}) {
  const { choreoId } = await params;
  const choreo = await choreoRepoServer.get(choreoId);
  if (!choreo) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name?.trim() || user.email?.split('@')[0] || 'Anon';

  return (
    <EditorShell
      initialChoreo={choreo}
      currentUser={{
        email: user.email ?? '(no email)',
        displayName,
      }}
    />
  );
}
