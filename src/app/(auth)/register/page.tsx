'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setErr(error.message);
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-panel border border-border rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-semibold">Create account</h1>
        <input className="w-full bg-bg border border-border rounded px-3 py-2"
          type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full bg-bg border border-border rounded px-3 py-2"
          type="password" placeholder="Password" minLength={8}
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button disabled={loading} className="w-full bg-accent py-2 rounded font-medium disabled:opacity-50">
          {loading ? '…' : 'Create account'}
        </button>
        <p className="text-sm text-white/60">
          Already have one? <Link href="/login" className="text-accent">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
