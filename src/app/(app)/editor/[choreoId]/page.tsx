import { notFound } from 'next/navigation';
import { choreoRepoServer } from '@/lib/supabase/choreoRepo.server';
import { EditorShell } from '@/components/layout/EditorShell';

export default async function EditorPage({
  params,
}: {
  params: Promise<{ choreoId: string }>;
}) {
  const { choreoId } = await params;
  const choreo = await choreoRepoServer.get(choreoId);
  if (!choreo) notFound();
  return <EditorShell initialChoreo={choreo} />;
}
