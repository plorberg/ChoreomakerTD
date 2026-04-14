'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

interface Props {
  id: string;
  title: string;
  updatedAt: string;
}

export function ChoreoCard({ id, title, updatedAt }: Props) {
  const [editing, setEditing] = useState(false);
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
              // Delay to let click on a sibling button register first
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
          <div className="text-xs text-white/50 mt-1">
            Enter to save · Esc to cancel
          </div>
        </form>
      ) : (
        <Link
          href={`/editor/${id}`}
          className="block bg-panel border border-border rounded-lg p-4 hover:border-accent transition"
        >
          <div className="font-medium truncate pr-16">{title}</div>
          <div className="text-xs text-white/50 mt-1">
            Updated {new Date(updatedAt).toLocaleString()}
          </div>
        </Link>
      )}

      {!editing && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
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
            >
              ×
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
