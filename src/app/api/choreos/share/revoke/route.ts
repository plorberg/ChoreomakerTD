import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shareRepo } from '@/lib/supabase/shareRepo';
import { publicUrl } from '@/lib/http/publicUrl';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = form.get('token') as string | null;
  const choreoId = form.get('choreoId') as string | null;
  if (!token) {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(publicUrl(req, '/login'), { status: 303 });
  }

  // RLS on share_links ensures only owner can delete; we still pass through.
  try {
    await shareRepo.revoke(token);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'revoke-failed' }, { status: 500 });
  }

  const back = choreoId ? `/dashboard?share=${choreoId}` : '/dashboard';
  return NextResponse.redirect(publicUrl(req, back), { status: 303 });
}
