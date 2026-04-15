import { notFound } from 'next/navigation';
import { shareRepo } from '@/lib/supabase/shareRepo';
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

  return (
    <ShareEditorShell
      initialChoreo={result.choreo}
      role={result.link.role}
      token={result.link.token}
    />
  );
}
