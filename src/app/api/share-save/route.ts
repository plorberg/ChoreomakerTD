import { NextResponse, type NextRequest } from 'next/server';
import { shareRepo } from '@/lib/supabase/shareRepo';

export const runtime = 'nodejs';

/**
 * POST /api/share-save
 * Body: { token, choreo }
 * Validates the token + role, then writes the choreography via the
 * service-role client. No user session required.
 */
export async function POST(req: NextRequest) {
  let body: { token?: string; choreo?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }
  const token = body.token;
  const choreo = body.choreo as Parameters<typeof shareRepo.saveViaToken>[1] | undefined;
  if (!token || !choreo) {
    return NextResponse.json({ error: 'missing-fields' }, { status: 400 });
  }
  try {
    await shareRepo.saveViaToken(token, choreo);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
