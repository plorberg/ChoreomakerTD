import { notFound } from 'next/navigation';
import { choreoRepo } from '@/lib/supabase/choreoRepo';
import { EditorShell } from '@/components/layout/EditorShell';

export default async function EditorPage({
  params,
}: {
  params: Promise<{ choreoId: string }>;
}) {
  const { choreoId } = await params;
  const choreo = await choreoRepo.get(choreoId);
  if (!choreo) notFound();
  return <EditorShell initialChoreo={choreo} />;
}
