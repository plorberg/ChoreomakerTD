'use client';

import { useEffect, useState } from 'react';

/**
 * Renders a timestamp deterministically on the server (so hydration matches)
 * and upgrades to the user's locale format on the client after mount.
 *
 * Why: Date#toLocaleString uses the runtime's default locale. The Node.js
 * server defaults to 'en-US', the browser uses navigator.language. Different
 * outputs → React hydration mismatch.
 */
export function FormattedDate({ iso }: { iso: string }) {
  const [text, setText] = useState(() => formatIsoMinute(iso));

  useEffect(() => {
    // After hydration, switch to the user's locale format.
    setText(new Date(iso).toLocaleString());
  }, [iso]);

  return <span suppressHydrationWarning>{text}</span>;
}

function formatIsoMinute(iso: string): string {
  // Output: 2026-04-15 09:37  (UTC, deterministic)
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
  );
}
