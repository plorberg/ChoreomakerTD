import { NextResponse, type NextRequest } from 'next/server';
import { adminRepo } from '@/lib/supabase/adminRepo';
import { publicUrl } from '@/lib/http/publicUrl';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await adminRepo.isCurrentUserAdmin())) {
    return NextResponse.redirect(publicUrl(req, '/dashboard'), { status: 303 });
  }
  const form = await req.formData();
  const userId = form.get('userId') as string | null;
  const role = form.get('role') as string | null;
  if (!userId || (role !== 'user' && role !== 'admin')) {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }
  try {
    await adminRepo.setRole(userId, role);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'set-role-failed' }, { status: 500 });
  }
  return NextResponse.redirect(publicUrl(req, '/admin'), { status: 303 });
}
