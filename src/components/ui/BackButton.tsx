'use client';

import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="text-accent hover:underline text-sm"
    >
      &larr; Back
    </button>
  );
}
