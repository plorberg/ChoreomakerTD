import type { NextRequest } from 'next/server';

/**
 * Build an absolute URL using the forwarded headers set by reverse proxies
 * (GitHub Codespaces, Vercel, Cloudflare, etc). Using `req.url` directly
 * fails in Codespaces because the internal URL carries :3000 but the public
 * host already encodes the port in its subdomain.
 */
export function publicUrl(req: NextRequest, path: string): string {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000';
  const proto =
    req.headers.get('x-forwarded-proto') ??
    (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}${path.startsWith('/') ? path : `/${path}`}`;
}
