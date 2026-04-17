import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/serviceClient';

export const runtime = 'nodejs';

/**
 * POST /api/audio-url
 * Body: { path: string }
 * Returns: { url: string }
 *
 * Takes a raw Supabase Storage path (e.g. "userId/uuid.mp3") and returns
 * a fresh signed URL (4h TTL). Uses the service-role client so no user
 * session is required — share-link visitors can use this too.
 *
 * Security: the path contains a UUID that's unguessable, so knowing the
 * path is proof of authorization (same model as Supabase signed URLs).
 */
export async function POST(req: NextRequest) {
  let body: { path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }
  let rawPath = body.path;
  if (!rawPath || typeof rawPath !== 'string') {
    return NextResponse.json({ error: 'missing-path' }, { status: 400 });
  }

  // If it's a full Supabase signed URL, extract the raw storage path so
  // we can re-sign it fresh. Signed URLs look like:
  //   https://xxx.supabase.co/storage/v1/object/sign/audio/userId/uuid.mp3?token=...
  if (rawPath.startsWith('http')) {
    const match = rawPath.match(/\/storage\/v1\/object\/sign\/audio\/(.+?)(?:\?|$)/);
    if (match?.[1]) {
      rawPath = decodeURIComponent(match[1]);
    } else {
      // Not a recognizable Supabase URL — pass it through as-is and hope
      // the caller can fetch it directly.
      return NextResponse.json({ url: rawPath });
    }
  }

  try {
    const svc = createServiceClient();
    const { data, error } = await svc.storage
      .from('audio')
      .createSignedUrl(rawPath, 60 * 60 * 4); // 4h TTL
    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message ?? 'sign-failed' }, { status: 500 });
    }
    return NextResponse.json({ url: data.signedUrl });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
