import Link from 'next/link';
import { BackButton } from '@/components/ui/BackButton';

export const metadata = { title: 'Choreo — Help' };

export default function HelpPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-10">
        <BackButton />
        <h1 className="text-2xl md:text-3xl font-bold mt-4">Help &amp; Documentation</h1>
        <p className="text-white/60 mt-2 text-sm">
          Everything you need to know to plan and share your choreographies.
        </p>
      </div>

      <nav className="mb-12 p-4 bg-panel border border-border rounded-lg text-sm">
        <h2 className="text-xs uppercase tracking-wider text-white/50 mb-3">Contents</h2>
        <ol className="space-y-1 text-accent">
          <li><a href="#getting-started" className="hover:underline">1. Getting started</a></li>
          <li><a href="#stage" className="hover:underline">2. The Stage (2D editor)</a></li>
          <li><a href="#formations" className="hover:underline">3. Formations</a></li>
          <li><a href="#performers" className="hover:underline">4. Performers</a></li>
          <li><a href="#split-merge" className="hover:underline">5. Split &amp; Merge couples</a></li>
          <li><a href="#audio" className="hover:underline">6. Audio &amp; Playback</a></li>
          <li><a href="#transitions" className="hover:underline">7. Transitions &amp; Distances</a></li>
          <li><a href="#sharing" className="hover:underline">8. Sharing &amp; Collaboration</a></li>
          <li><a href="#pdf" className="hover:underline">9. PDF export</a></li>
          <li><a href="#keyboard" className="hover:underline">10. Keyboard shortcuts</a></li>
          <li><a href="#admin" className="hover:underline">11. Admin panel</a></li>
        </ol>
      </nav>

      <S id="getting-started" t="1. Getting started">
        <p>After signing in you land on the <b>Dashboard</b> where you can create, rename, share, and delete choreographies.</p>
        <p>Click <b>+ New</b> to create a choreography. It opens with a 16&times;16 m stage, 8 couples, and one formation at 0:00.</p>
        <p>The editor has three areas: <b>left sidebar</b> (formations, performers, stage, audio), <b>center stage</b> (2D / 3D), and <b>right sidebar</b> (details, notes, distances).</p>
      </S>

      <S id="stage" t="2. The Stage (2D editor)">
        <p>The 2D view shows the stage from above. <b>Upstage</b> (away from audience) is at the top, <b>Downstage</b> at the bottom. Center is (0, 0).</p>
        <p>Each performer is a colored circle with initials. A white dot inside shows the <b>facing direction</b>.</p>
        <H4>Moving performers</H4>
        <UL items={[
          'Click and drag to move. Positions snap to a 0.5 m grid.',
          'Hold Shift while dragging to bypass snap.',
          'Arrow keys nudge by 0.5 m (Shift: 0.1 m).',
        ]} />
        <H4>Selecting</H4>
        <UL items={[
          'Click to select, Shift+click to add/remove.',
          'Drag on background to draw a marquee.',
          'Esc clears selection.',
        ]} />
        <H4>Rotation</H4>
        <UL items={[
          'Drag the rotation handle (white circle on a line) to set facing.',
          'Rotation snaps to 45° — hold Shift for free rotation.',
          'R rotates +45°, Shift+R rotates −45°.',
        ]} />
        <H4>Stage settings</H4>
        <p>Under <b>Stage</b> in the left sidebar you can change the stage size (always square, in meters) and choose a floor color.</p>
      </S>

      <S id="formations" t="3. Formations">
        <p>A choreography consists of <b>formations</b> (&ldquo;Bilder&rdquo;). Each records every performer&apos;s position, rotation, and split state at a point in time.</p>
        <H4>Order</H4>
        <p>Formations are ordered by their <b>time</b> (the &ldquo;Reach at&rdquo; value). Changing the time re-sorts the list automatically.</p>
        <H4>Adding &amp; duplicating</H4>
        <UL items={[
          '+ Add creates a new formation after the last one.',
          '⎘ Duplicate places a copy halfway between the current and next formation.',
        ]} />
        <H4>Reordering</H4>
        <p>Drag a formation by its <b>⋮⋮</b> handle. Dropping it between two formations sets its time to the midpoint.</p>
      </S>

      <S id="performers" t="4. Performers">
        <UL items={[
          'Double-click a name to rename.',
          'Click the color swatch to change color.',
          'Delete or Backspace removes selected performers.',
        ]} />
      </S>

      <S id="split-merge" t="5. Split & Merge couples">
        <p>A token normally represents a couple. You can <b>split</b> them so Leader and Follower appear separately. This is <b>per formation</b>.</p>
        <UL items={[
          'Press S to toggle split/merge, or use the buttons in the right sidebar.',
          'Leader: solid circle. Follower: hollow ring with dashed outline.',
          'Drag the Follower independently.',
          'During playback, split/merge transitions animate smoothly.',
        ]} />
      </S>

      <S id="audio" t="6. Audio & Playback">
        <H4>Upload</H4>
        <p>Under <b>Audio</b> in the left sidebar, click <b>Upload audio</b> to attach a music file.</p>
        <H4>Playback</H4>
        <UL items={[
          'Space or ▶ to play/pause.',
          'Drag the playhead slider to scrub.',
          'Arrow keys scrub ±1 s when no performers are selected.',
        ]} />
        <H4>Speed</H4>
        <p>The <b>Speed</b> input (50–150%) adjusts playback tempo. Pitch is preserved.</p>
      </S>

      <S id="transitions" t="7. Transitions & Distances">
        <H4>Paths</H4>
        <p>Toggle <b>Paths</b> in the toolbar to see dashed lines showing each performer&apos;s movement from the previous formation.</p>
        <H4>Distances</H4>
        <p>Toggle <b>Distances</b> to see the <b>Top 3 longest distances</b> in the right sidebar — useful for checking feasibility of transitions.</p>
      </S>

      <S id="sharing" t="8. Sharing & Collaboration">
        <p>On the Dashboard, hover a card and click <b>🔗 Share</b>.</p>
        <H4>Link types</H4>
        <UL items={[
          'Viewer link — view, navigate, play audio, export PDF. Cannot edit.',
          'Editor link — full editing with auto-save.',
        ]} />
        <H4>Realtime collaboration</H4>
        <p>When multiple logged-in users open the same choreography, they see each other&apos;s <b>presence</b> (avatars) and <b>cursor positions</b> in real time. Changes sync live.</p>
        <H4>Managing links</H4>
        <p>You can <b>copy</b> a link or <b>revoke</b> it at any time.</p>
      </S>

      <S id="pdf" t="9. PDF export">
        <p>Click <b>Export PDF</b> in the transport bar. The PDF includes:</p>
        <UL items={[
          'Title page with cast list, details, and metadata.',
          'Per-formation stage thumbnail with grid, tokens, facing dots, and transition lines.',
          'Coordinates table (name + x, y per performer).',
          'Notes.',
        ]} />
        <p>PDF export works for owners and viewers alike.</p>
      </S>

      <S id="keyboard" t="10. Keyboard shortcuts">
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <thead className="text-xs uppercase text-white/50 border-b border-border">
              <tr>
                <th className="text-left py-2 pr-4">Key</th>
                <th className="text-left py-2">Action</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              <Row k="Space" d="Play / Pause" />
              <Row k="← →" d="Scrub ±1 s (no selection) or nudge ±0.5 m" />
              <Row k="Shift + ← →" d="Fine nudge ±0.1 m" />
              <Row k="R / Shift+R" d="Rotate selected ±45°" />
              <Row k="S" d="Toggle split/merge" />
              <Row k="Esc" d="Clear selection" />
              <Row k="Delete" d="Remove selected performers" />
              <Row k="⌘Z / Ctrl+Z" d="Undo" />
              <Row k="⌘⇧Z / Ctrl+Y" d="Redo" />
              <Row k="⌘S / Ctrl+S" d="Save now" />
            </tbody>
          </table>
        </div>
      </S>

      <div className="mt-16 pt-6 border-t border-border text-center text-white/40 text-sm">
        Choreo &middot; Help &amp; Documentation
      </div>
    </main>
  );
}

function S({ id, t, children }: { id: string; t: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-8">
      <h2 className="text-lg md:text-xl font-semibold mb-3 pb-2 border-b border-border">{t}</h2>
      <div className="space-y-2 text-sm text-white/80 leading-relaxed">{children}</div>
    </section>
  );
}
function H4({ children }: { children: React.ReactNode }) {
  return <h4 className="font-semibold mt-4 mb-1">{children}</h4>;
}
function UL({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1 text-white/80">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
}
function Row({ k, d }: { k: string; d: string }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-4"><kbd className="px-1.5 py-0.5 bg-border/50 rounded text-white/90 text-xs font-mono">{k}</kbd></td>
      <td className="py-2">{d}</td>
    </tr>
  );
}
