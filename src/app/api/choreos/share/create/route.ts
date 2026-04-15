import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shareRepo, type ShareRole } from '@/lib/supabase/shareRepo';
import { publicUrl } from '@/lib/http/publicUrl';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const choreoId = form.get('choreoId') as string | null;
  const role = (form.get('role') as ShareRole | null) ?? 'viewer';

  if (!choreoId || (role !== 'viewer' && role !== 'editor')) {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(publicUrl(req, '/login'), { status: 303 });
  }

  // Confirm ownership before creating a link
  const { data: c } = await supabase
    .from('choreographies')
    .select('id')
    .eq('id', choreoId)
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!c) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  try {
    await shareRepo.create(choreoId, role);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'create-failed' }, { status: 500 });
  }

  return NextResponse.redirect(publicUrl(req, `/dashboard?share=${choreoId}`), { status: 303 });
}
