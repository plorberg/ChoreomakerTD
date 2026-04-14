'use client';

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { Choreography, Formation } from '@/domain/choreo';
import { formatTime } from '@/lib/format/time';

// react-pdf doesn't support SVG <pattern>, so the stage thumbnail is a stack
// of absolutely-positioned <View>s. Rotation is done via CSS transform on
// a thin rectangle to show each performer's facing direction.

const STAGE_PX = 200;          // square stage thumbnail edge
const DOT_R = 5;
const AXIS_PAD = 14;           // space around the stage for tick labels

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: 'Helvetica' },

  // --- Title page ---
  titlePage: { padding: 50, fontFamily: 'Helvetica' },
  titleH1: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  titleSubtitle: { fontSize: 12, color: '#666', marginBottom: 36 },
  titleSection: { marginTop: 22 },
  titleSectionLabel: {
    fontSize: 9,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  titleMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 4 },
  titleMetaItem: { width: 140, marginBottom: 8 },
  titleMetaKey: { fontSize: 8, color: '#888', textTransform: 'uppercase' },
  titleMetaVal: { fontSize: 12, color: '#222', marginTop: 1 },

  // Performer roster
  rosterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  rosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 150,
    marginBottom: 6,
    paddingVertical: 4,
  },
  rosterDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
    border: '1pt solid #333',
  },
  rosterName: { fontSize: 10, color: '#222' },

  titleFooter: {
    position: 'absolute',
    bottom: 40,
    left: 50,
    right: 50,
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
    borderTop: '0.5pt solid #ccc',
    paddingTop: 8,
  },

  // --- Formation pages ---
  h1: { fontSize: 22, marginBottom: 4, fontWeight: 'bold' },
  meta: { color: '#666', marginBottom: 16, fontSize: 10 },
  formation: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1pt solid #ddd',
  },
  fTitle: { fontSize: 13, marginBottom: 2, fontWeight: 'bold' },
  fMeta: { color: '#777', marginBottom: 6, fontSize: 9 },
  row: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },

  stageFrame: {
    width: STAGE_PX + AXIS_PAD * 2,
    height: STAGE_PX + AXIS_PAD * 2,
    position: 'relative',
  },
  stage: {
    position: 'absolute',
    left: AXIS_PAD,
    top: AXIS_PAD,
    width: STAGE_PX,
    height: STAGE_PX,
    border: '1.5pt solid #5a3a1a',
    backgroundColor: '#c89968',
  },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.18)' },
  gridLineMajor: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.3)' },
  gridLineCenter: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  axisLabel: {
    position: 'absolute',
    fontSize: 6,
    color: '#666',
    width: 14,
    textAlign: 'center',
  },
  axisLabelLeft: {
    position: 'absolute',
    fontSize: 6,
    color: '#666',
    width: 12,
    textAlign: 'right',
  },
  upstageLabel: {
    position: 'absolute',
    top: 1,
    left: 0,
    width: STAGE_PX + AXIS_PAD * 2,
    textAlign: 'center',
    fontSize: 6,
    color: '#888',
    fontWeight: 'bold',
  },
  downstageLabel: {
    position: 'absolute',
    bottom: 1,
    left: 0,
    width: STAGE_PX + AXIS_PAD * 2,
    textAlign: 'center',
    fontSize: 6,
    color: '#888',
    fontWeight: 'bold',
  },
  dot: { position: 'absolute', width: DOT_R * 2, height: DOT_R * 2, borderRadius: DOT_R },
  notes: { flex: 1, fontSize: 10, lineHeight: 1.4 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 9,
    color: '#888',
    textAlign: 'center',
  },
});

// ------------------------------------------------------------------
// Title page
// ------------------------------------------------------------------

function TitlePage({ choreo }: { choreo: Choreography }) {
  const totalDuration = choreo.formations.reduce((m, f) => Math.max(m, f.timeSec), 0);
  const createdDate = new Date(choreo.createdAt).toLocaleDateString();
  const updatedDate = new Date(choreo.updatedAt).toLocaleDateString();

  return (
    <Page size="A4" style={s.titlePage}>
      <Text style={s.titleH1}>{choreo.title}</Text>
      <Text style={s.titleSubtitle}>Choreography document</Text>

      <View style={s.titleSection}>
        <Text style={s.titleSectionLabel}>Details</Text>
        <View style={s.titleMetaGrid}>
          <View style={s.titleMetaItem}>
            <Text style={s.titleMetaKey}>Performers</Text>
            <Text style={s.titleMetaVal}>{choreo.performers.length}</Text>
          </View>
          <View style={s.titleMetaItem}>
            <Text style={s.titleMetaKey}>Formations</Text>
            <Text style={s.titleMetaVal}>{choreo.formations.length}</Text>
          </View>
          <View style={s.titleMetaItem}>
            <Text style={s.titleMetaKey}>Total length</Text>
            <Text style={s.titleMetaVal}>{formatTime(totalDuration)}</Text>
          </View>
          <View style={s.titleMetaItem}>
            <Text style={s.titleMetaKey}>Stage size</Text>
            <Text style={s.titleMetaVal}>
              {choreo.stage.width} × {choreo.stage.width} m
            </Text>
          </View>
          {choreo.audio && (
            <View style={s.titleMetaItem}>
              <Text style={s.titleMetaKey}>Audio</Text>
              <Text style={s.titleMetaVal}>{choreo.audio.name}</Text>
            </View>
          )}
          <View style={s.titleMetaItem}>
            <Text style={s.titleMetaKey}>Created</Text>
            <Text style={s.titleMetaVal}>{createdDate}</Text>
          </View>
          <View style={s.titleMetaItem}>
            <Text style={s.titleMetaKey}>Last updated</Text>
            <Text style={s.titleMetaVal}>{updatedDate}</Text>
          </View>
        </View>
      </View>

      <View style={s.titleSection}>
        <Text style={s.titleSectionLabel}>Cast</Text>
        <View style={s.rosterGrid}>
          {choreo.performers.map((p) => (
            <View key={p.id} style={s.rosterItem}>
              <View style={[s.rosterDot, { backgroundColor: p.color }]} />
              <Text style={s.rosterName}>{p.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {choreo.description && (
        <View style={s.titleSection}>
          <Text style={s.titleSectionLabel}>Description</Text>
          <Text style={{ fontSize: 10, color: '#222', lineHeight: 1.5 }}>
            {choreo.description}
          </Text>
        </View>
      )}

      <Text style={s.titleFooter} fixed>
        Generated with Choreo · {new Date().toLocaleDateString()}
      </Text>
    </Page>
  );
}

// ------------------------------------------------------------------
// Stage thumbnail (used on formation pages)
// ------------------------------------------------------------------

function StageThumbnail({
  choreo,
  f,
  prev,
}: {
  choreo: Choreography;
  f: Formation;
  prev: Formation | null;
}) {
  const stageMeters = choreo.stage.width;
  const pxPerMeter = STAGE_PX / stageMeters;

  const meterLines: { axis: 'x' | 'y'; m: number; weight: 'minor' | 'major' | 'center' }[] = [];
  for (let i = 0; i <= stageMeters; i++) {
    const m = i - stageMeters / 2;
    const weight = m === 0 ? 'center' : m % 5 === 0 ? 'major' : 'minor';
    meterLines.push({ axis: 'x', m, weight });
    meterLines.push({ axis: 'y', m, weight });
  }

  const ticks: number[] = [];
  for (let i = 0; i <= stageMeters; i++) {
    const m = i - stageMeters / 2;
    if (m % 2 === 0) ticks.push(m);
  }

  return (
    <View style={s.stageFrame}>
      <Text style={s.upstageLabel}>UPSTAGE</Text>
      <View style={s.stage}>
        {/* Grid lines */}
        {meterLines.map(({ axis, m, weight }, idx) => {
          const offsetPx = (m + stageMeters / 2) * pxPerMeter;
          const styleObj =
            weight === 'center' ? s.gridLineCenter : weight === 'major' ? s.gridLineMajor : s.gridLine;
          if (axis === 'x') {
            return (
              <View
                key={idx}
                style={[
                  styleObj,
                  {
                    left: offsetPx - (weight === 'center' ? 0.6 : 0.3),
                    top: 0,
                    width: weight === 'center' ? 1.2 : weight === 'major' ? 0.7 : 0.4,
                    height: STAGE_PX,
                  },
                ]}
              />
            );
          }
          return (
            <View
              key={idx}
              style={[
                styleObj,
                {
                  top: offsetPx - (weight === 'center' ? 0.6 : 0.3),
                  left: 0,
                  height: weight === 'center' ? 1.2 : weight === 'major' ? 0.7 : 0.4,
                  width: STAGE_PX,
                },
              ]}
            />
          );
        })}

        {/* Transition paths from the previous formation to this one */}
        {prev &&
          choreo.performers.map((p) => {
            const a = prev.states[p.id];
            const b = f.states[p.id];
            if (!a || !b) return null;
            const ax = (a.position.x + stageMeters / 2) * pxPerMeter;
            const ay = (a.position.y + stageMeters / 2) * pxPerMeter;
            const bx = (b.position.x + stageMeters / 2) * pxPerMeter;
            const by = (b.position.y + stageMeters / 2) * pxPerMeter;
            const dx = bx - ax;
            const dy = by - ay;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.5) return null; // performer didn't move
            const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
            return (
              <View
                key={`path-${p.id}`}
                style={{
                  position: 'absolute',
                  left: ax,
                  top: ay - 0.4,
                  width: len,
                  height: 0.8,
                  backgroundColor: p.color,
                  opacity: 0.55,
                  transform: `rotate(${angleDeg}deg)`,
                  transformOrigin: '0pt 0.4pt',
                }}
              />
            );
          })}

        {/* Performer tokens + facing indicators */}
        {choreo.performers.map((p) => {
          const st = f.states[p.id];
          if (!st) return null;
          const lx = (st.position.x + stageMeters / 2) * pxPerMeter;
          const ly = (st.position.y + stageMeters / 2) * pxPerMeter;

          // Facing pip: a small white dot just inside the token edge,
          // pointing in the direction of rotationDeg. Same convention as 2D.
          const PIP_R = 1.2;
          const PIP_DIST = DOT_R - PIP_R - 0.5;
          const facingPip = (deg: number, cx: number, cy: number, fill: string) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <View
                style={{
                  position: 'absolute',
                  left: cx + Math.sin(rad) * PIP_DIST - PIP_R,
                  top: cy - Math.cos(rad) * PIP_DIST - PIP_R,
                  width: PIP_R * 2,
                  height: PIP_R * 2,
                  borderRadius: PIP_R,
                  backgroundColor: fill,
                }}
              />
            );
          };

          const nodes: React.ReactNode[] = [];

          // Leader / solo token
          nodes.push(
            <View
              key={`${p.id}-leader`}
              style={[
                s.dot,
                { left: lx - DOT_R, top: ly - DOT_R, backgroundColor: p.color },
              ]}
            />,
          );
          nodes.push(
            <View key={`${p.id}-leader-pip`}>
              {facingPip(st.rotationDeg, lx, ly, '#ffffff')}
            </View>,
          );

          // Follower (split couple)
          if (st.splitOffset) {
            const fx = lx + st.splitOffset.x * pxPerMeter;
            const fy = ly + st.splitOffset.y * pxPerMeter;
            nodes.push(
              <View
                key={`${p.id}-follower`}
                style={{
                  position: 'absolute',
                  left: fx - DOT_R,
                  top: fy - DOT_R,
                  width: DOT_R * 2,
                  height: DOT_R * 2,
                  borderRadius: DOT_R,
                  borderWidth: 1.5,
                  borderColor: p.color,
                  backgroundColor: '#ffffff',
                }}
              />,
            );
            // Follower pip is the performer color (since the fill is white)
            nodes.push(
              <View key={`${p.id}-follower-pip`}>
                {facingPip(st.rotationDeg, fx, fy, p.color)}
              </View>,
            );
          }

          return <View key={p.id}>{nodes}</View>;
        })}
      </View>

      {/* Axis tick labels */}
      {ticks.map((m) => {
        const offsetPx = (m + stageMeters / 2) * pxPerMeter;
        return (
          <View key={`tick-${m}`}>
            <Text
              style={[s.axisLabel, { left: AXIS_PAD + offsetPx - 7, top: AXIS_PAD + STAGE_PX + 2 }]}
            >
              {m}
            </Text>
            <Text
              style={[s.axisLabelLeft, { left: 0, top: AXIS_PAD + offsetPx - 3 }]}
            >
              {-m}
            </Text>
          </View>
        );
      })}

      <Text style={s.downstageLabel}>DOWNSTAGE (audience)</Text>
    </View>
  );
}

function FormationBlock({
  choreo,
  f,
  prev,
}: {
  choreo: Choreography;
  f: Formation;
  prev: Formation | null;
}) {
  return (
    <View style={s.formation} wrap={false}>
      <Text style={s.fTitle}>
        {f.index + 1}. {f.name}
      </Text>
      <Text style={s.fMeta}>
        Reach at {formatTime(f.timeSec)} · move {(f.transitionSec ?? 2).toFixed(1)}s ·{' '}
        {f.counts ?? 0} counts
      </Text>
      <View style={s.row}>
        <StageThumbnail choreo={choreo} f={f} prev={prev} />
        <View style={s.notes}>
          <Text>{f.notes || '—'}</Text>
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------
// Document
// ------------------------------------------------------------------

function ChoreoDocument({ choreo }: { choreo: Choreography }) {
  // Build a lookup from formation.id → previous formation in time-sorted order.
  // (The user may have reordered formations; we follow timeSec here because
  // that matches playback and interpolation.)
  const sorted = [...choreo.formations].sort((a, b) => a.timeSec - b.timeSec);
  const prevById = new Map<string, Formation | null>();
  sorted.forEach((f, i) => {
    prevById.set(f.id, i > 0 ? sorted[i - 1] : null);
  });

  return (
    <Document title={choreo.title}>
      <TitlePage choreo={choreo} />
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>{choreo.title}</Text>
        <Text style={s.meta}>
          {choreo.performers.length} performers · {choreo.formations.length} formations ·{' '}
          stage {choreo.stage.width}×{choreo.stage.width}m
          {choreo.audio ? ` · audio: ${choreo.audio.name}` : ''}
        </Text>
        {choreo.formations.map((f) => (
          <FormationBlock key={f.id} choreo={choreo} f={f} prev={prevById.get(f.id) ?? null} />
        ))}
        <Text style={s.footer} fixed>
          Generated with Choreo
        </Text>
      </Page>
    </Document>
  );
}

export async function exportChoreoPdf(choreo: Choreography) {
  const blob = await pdf(<ChoreoDocument choreo={choreo} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${choreo.title.replace(/[^a-z0-9]+/gi, '_') || 'choreo'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
