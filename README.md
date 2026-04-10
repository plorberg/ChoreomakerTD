# Choreo

Plan choreographies in 2D, preview in 3D, sync to music, export as PDF.
Built with Next.js 15, Supabase, react-konva, react-three-fiber, Zustand, and @react-pdf/renderer.

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript**, strict
- **Supabase** — Auth + Postgres (JSONB) + Storage
- **react-konva** for the 2D editor
- **@react-three/fiber + drei** for the 3D preview
- **Zustand + immer** for editor state
- **@react-pdf/renderer** for client-side PDF export
- **Stripe** (stubbed) for future billing
- **Vercel** for hosting

## Getting started

```bash
npm install
cp .env.example .env.local
# Fill in Supabase URL + anon key
```

### 1. Set up Supabase

1. Create a project at https://supabase.com (free tier).
2. Open the SQL editor and run `supabase/migrations/0001_init.sql`.
3. Copy your Project URL and anon key into `.env.local`.

### 2. Run locally

```bash
npm run dev
```

Open http://localhost:3000.

### 3. Deploy to Vercel

1. Push to GitHub.
2. Import the repo at https://vercel.com/new.
3. Add env vars (same as `.env.local`).
4. Deploy. Done.

## Project layout

```
src/
  app/                Next.js routes
    (auth)/           login, register
    (app)/            protected app shell (dashboard, editor)
    api/stripe/       webhook stub
  domain/             TypeScript types — single source of truth
  store/              Zustand editor store
  lib/
    supabase/         client, server, repo
    licensing/        entitlements resolver
    pdf/              PDF export service
    audio/            audio engine hook
  components/
    layout/           EditorShell
    editor/           Stage2D, Stage3D, FormationList, NotesPanel, ...
  hooks/              useAutoSave
  middleware.ts       auth gate
supabase/migrations/  SQL schema
```

## Data model

See `src/domain/choreo.ts`. The whole `Choreography` aggregate is stored as
a single JSONB column. This keeps the editor fast (one read, one write) and
lets the schema evolve via `schemaVersion`. Relational projections can be
added later without breaking the write path.

## Feature gates

All billing-sensitive features go through `resolveEntitlements()` in
`src/lib/licensing/entitlements.ts`. Free tier is capped at 2 choreographies
and 8 formations each, with watermarked PDF export.

## Roadmap

- [ ] WaveSurfer timeline with drag-to-place cues
- [ ] Smooth transition animation between formations (LERP on playhead)
- [ ] Audio upload to Supabase Storage
- [ ] Undo/redo via `zundo`
- [ ] Stripe Checkout + pricing page
- [ ] Realtime collaboration (Supabase Broadcast)
- [ ] Mobile touch polish (pinch zoom, long-press rotate)
