import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminRepo } from '@/lib/supabase/adminRepo';
import { publicUrl } from '@/lib/http/publicUrl';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await adminRepo.isCurrentUserAdmin())) {
    return NextResponse.redirect(publicUrl(req, '/dashboard'), { status: 303 });
  }
  const form = await req.formData();
  const id = form.get('id') as string | null;
  if (!id) return NextResponse.json({ error: 'bad-request' }, { status: 400 });

  // Admin RLS policy "admin deletes any choreo" allows this even though
  // the calling user is not the owner.
  const supabase = await createClient();
  const { error } = await supabase.from('choreographies').delete().eq('id', id);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: 'delete-failed' }, { status: 500 });
  }
  return NextResponse.redirect(publicUrl(req, '/admin'), { status: 303 });
}
