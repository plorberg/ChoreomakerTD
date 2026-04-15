'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ShareDialog } from './ShareDialog';
import { FormattedDate } from '@/components/ui/FormattedDate';
import type { ShareLink } from '@/lib/supabase/shareRepo';

interface Props {
  id: string;
  title: string;
  updatedAt: string;
  shareLinks: ShareLink[];
  initiallyOpenShare: boolean;
}

export function ChoreoCard({ id, title, updatedAt, shareLinks, initiallyOpenShare }: Props) {
  const [editing, setEditing] = useState(false);
  const [shareOpen, setShareOpen] = useState(initiallyOpenShare);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <li className="relative group">
      {editing ? (
        <form
          ref={formRef}
          action="/api/choreos/rename"
          method="post"
          className="block bg-panel border border-accent rounded-lg p-4"
        >
          <input type="hidden" name="id" value={id} />
          <input
            name="title"
            defaultValue={title}
            autoFocus
            maxLength={200}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setEditing(false);
              }
            }}
            onBlur={(e) => {
              setTimeout(() => {
                if (e.target.value.trim() && e.target.value.trim() !== title) {
                  formRef.current?.submit();
                } else {
                  setEditing(false);
                }
              }, 100);
            }}
            className="w-full bg-bg border border-border rounded px-2 py-1 text-sm font-medium outline-none focus:border-accent"
          />
          <div className="text-xs text-white/50 mt-1">Enter to save · Esc to cancel</div>
        </form>
      ) : (
        <Link
          href={`/editor/${id}`}
          className="block bg-panel border border-border rounded-lg p-4 hover:border-accent transition"
        >
          <div className="font-medium truncate pr-24">{title}</div>
          <div className="text-xs text-white/50 mt-1 flex items-center gap-2">
            <span>Updated <FormattedDate iso={updatedAt} /></span>
            {shareLinks.length > 0 && (
              <span className="text-accent" title={`${shareLinks.length} active share link(s)`}>
                · 🔗 {shareLinks.length}
              </span>
            )}
          </div>
        </Link>
      )}

      {!editing && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShareOpen(true);
            }}
            className="text-white/50 hover:text-white text-sm px-2"
            title="Share"
          >
            🔗
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setEditing(true);
            }}
            className="text-white/50 hover:text-white text-sm px-2"
            title="Rename"
          >
            ✎
          </button>
          <form action="/api/choreos/delete" method="post">
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="text-red-400 hover:text-red-300 text-lg px-2"
              title="Delete"
              onClick={(e) => {
                if (!confirm(`Delete "${title}"?`)) e.preventDefault();
              }}
            >
              ×
            </button>
          </form>
        </div>
      )}

      {shareOpen && (
        <ShareDialog
          choreoId={id}
          title={title}
          links={shareLinks}
          onClose={() => setShareOpen(false)}
        />
      )}
    </li>
  );
}
