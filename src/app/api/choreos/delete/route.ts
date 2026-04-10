import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publicUrl } from '@/lib/http/publicUrl';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const id = form.get('id') as string | null;
  if (!id) {
    return NextResponse.redirect(publicUrl(req, '/dashboard'), { status: 303 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(publicUrl(req, '/login'), { status: 303 });

  await supabase
    .from('choreographies')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id);

  return NextResponse.redirect(publicUrl(req, '/dashboard'), { status: 303 });
}
