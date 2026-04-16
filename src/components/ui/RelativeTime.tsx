'use client';

import { useEffect, useState } from 'react';

/**
 * Renders a relative time string like "vor 3s", "vor 2 min", updating
 * every second via an interval. Returns `placeholder` when `iso` is null.
 */
export function RelativeTime({
  ms,
  placeholder = '—',
}: {
  ms: number | null;
  placeholder?: string;
}) {
  const [, tick] = useState(0);

  useEffect(() => {
    if (ms == null) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [ms]);

  if (ms == null) return <span suppressHydrationWarning>{placeholder}</span>;
  return <span suppressHydrationWarning>{formatRelative(Date.now() - ms)}</span>;
}

function formatRelative(deltaMs: number): string {
  const s = Math.max(0, Math.round(deltaMs / 1000));
  if (s < 5) return 'gerade eben';
  if (s < 60) return `vor ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `vor ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `vor ${h} h`;
  const d = Math.round(h / 24);
  return `vor ${d} d`;
}
