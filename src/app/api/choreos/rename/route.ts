import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publicUrl } from '@/lib/http/publicUrl';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const id = form.get('id') as string | null;
  const rawTitle = form.get('title') as string | null;

  if (!id || !rawTitle) {
    return NextResponse.redirect(publicUrl(req, '/dashboard'), { status: 303 });
  }
  const title = rawTitle.trim().slice(0, 200);
  if (!title) {
    return NextResponse.redirect(publicUrl(req, '/dashboard'), { status: 303 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(publicUrl(req, '/login'), { status: 303 });
  }

  // Load the current choreo so we can update both the column and the JSONB.
  const { data: current } = await supabase
    .from('choreographies')
    .select('data')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (!current) {
    return NextResponse.redirect(publicUrl(req, '/dashboard'), { status: 303 });
  }

  const nextData = {
    ...(current.data as Record<string, unknown>),
    title,
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('choreographies')
    .update({ title, data: nextData, updated_at: nextData.updatedAt })
    .eq('id', id)
    .eq('owner_id', user.id);

  if (error) {
    console.error(error);
    return NextResponse.redirect(publicUrl(req, '/dashboard?error=rename'), { status: 303 });
  }

  return NextResponse.redirect(publicUrl(req, '/dashboard'), { status: 303 });
}
