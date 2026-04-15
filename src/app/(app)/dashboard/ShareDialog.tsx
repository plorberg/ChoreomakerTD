'use client';

import { useEffect, useState } from 'react';
import type { ShareLink } from '@/lib/supabase/shareRepo';

interface Props {
  choreoId: string;
  title: string;
  links: ShareLink[];
  onClose: () => void;
}

function buildShareUrl(token: string): string {
  if (typeof window === 'undefined') return `/share/${token}`;
  return `${window.location.origin}/share/${token}`;
}

export function ShareDialog({ choreoId, title, links, onClose }: Props) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyLink = async (token: string) => {
    const url = buildShareUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((c) => (c === token ? null : c)), 1500);
    } catch {
      // Fallback: select the input
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-panel border border-border rounded-lg shadow-xl w-full max-w-lg p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Share &ldquo;{title}&rdquo;</h2>
            <p className="text-xs text-white/50 mt-1">
              Anyone with a link can open this choreography. Editor links also
              allow saving changes.
            </p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl px-2">
            ×
          </button>
        </div>

        {/* Existing links */}
        {links.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {links.map((link) => {
              const url = buildShareUrl(link.token);
              const isCopied = copiedToken === link.token;
              return (
                <li
                  key={link.token}
                  className="flex items-center gap-2 p-2 bg-bg border border-border rounded"
                >
                  <span
                    className={`text-xs uppercase font-bold px-1.5 py-0.5 rounded ${
                      link.role === 'editor'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {link.role}
                  </span>
                  <input
                    readOnly
                    value={url}
                    className="flex-1 bg-transparent text-xs font-mono truncate outline-none"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <button
                    type="button"
                    onClick={() => copyLink(link.token)}
                    className="text-xs px-2 py-1 rounded border border-border hover:border-accent"
                  >
                    {isCopied ? '✓ Copied' : 'Copy'}
                  </button>
                  <form action="/api/choreos/share/revoke" method="post" className="inline">
                    <input type="hidden" name="token" value={link.token} />
                    <input type="hidden" name="choreoId" value={choreoId} />
                    <button
                      type="submit"
                      className="text-xs text-red-400 hover:text-red-300 px-2"
                      title="Revoke this link"
                      onClick={(e) => {
                        if (!confirm('Revoke this share link?')) e.preventDefault();
                      }}
                    >
                      Revoke
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-white/50 mb-4">No share links yet.</p>
        )}

        {/* Create new link */}
        <div className="border-t border-border pt-4">
          <p className="text-xs text-white/60 mb-2">Create a new share link:</p>
          <div className="flex gap-2">
            <form action="/api/choreos/share/create" method="post" className="flex-1">
              <input type="hidden" name="choreoId" value={choreoId} />
              <input type="hidden" name="role" value="viewer" />
              <button
                type="submit"
                className="w-full px-3 py-2 rounded border border-border hover:border-accent text-sm"
              >
                + Viewer link
                <div className="text-[10px] text-white/50 mt-0.5">Read-only · can export PDF</div>
              </button>
            </form>
            <form action="/api/choreos/share/create" method="post" className="flex-1">
              <input type="hidden" name="choreoId" value={choreoId} />
              <input type="hidden" name="role" value="editor" />
              <button
                type="submit"
                className="w-full px-3 py-2 rounded border border-border hover:border-accent text-sm"
              >
                + Editor link
                <div className="text-[10px] text-white/50 mt-0.5">Full editing access</div>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
