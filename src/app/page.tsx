import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
        Choreo<span className="text-accent">.</span>
      </h1>
      <p className="mt-4 max-w-xl text-white/70">
        Plan formations in 2D, preview in 3D, sync to music, and export a clean PDF for your team.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/register" className="bg-accent px-5 py-2.5 rounded-lg font-medium">
          Get started
        </Link>
        <Link href="/login" className="border border-border px-5 py-2.5 rounded-lg">
          Sign in
        </Link>
      </div>
    </main>
  );
}
