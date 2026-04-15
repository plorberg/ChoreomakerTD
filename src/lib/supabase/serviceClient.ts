import { createClient } from '@supabase/supabase-js';

/**
 * Server-only client that uses the service role key. Bypasses Row Level
 * Security. Use ONLY for operations that have already validated authorization
 * by some other means (e.g. share-link tokens).
 *
 * Never import this from a Client Component.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing Supabase service role config (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
