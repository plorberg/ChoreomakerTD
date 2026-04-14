'use client';

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { Choreography, Formation } from '@/domain/choreo';
import { formatTime } from '@/lib/format/time';

// react-pdf doesn't support SVG <pattern> or many advanced features, so we
// build the stage as a stack of absolutely-positioned <View>s.

const STAGE_PX = 200;          // square stage thumbnail edge
const DOT_R = 3;
const AXIS_PAD = 14;           // space around the stage for tick labels

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: 'Helvetica' },
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
  // Outer frame holds the stage + axis labels around it
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

function StageThumbnail({ choreo, f }: { choreo: Choreography; f: Formation }) {
  const stageMeters = choreo.stage.width;
  const pxPerMeter = STAGE_PX / stageMeters;

  // Lines at every meter; major every 5m; center solid.
  const meterLines: { axis: 'x' | 'y'; m: number; weight: 'minor' | 'major' | 'center' }[] = [];
  for (let i = 0; i <= stageMeters; i++) {
    const m = i - stageMeters / 2;
    const weight = m === 0 ? 'center' : m % 5 === 0 ? 'major' : 'minor';
    meterLines.push({ axis: 'x', m, weight });
    meterLines.push({ axis: 'y', m, weight });
  }

  // Tick labels every 2m
  const ticks: number[] = [];
  for (let i = 0; i <= stageMeters; i++) {
    const m = i - stageMeters / 2;
    if (m % 2 === 0) ticks.push(m);
  }

  return (
    <View style={s.stageFrame}>
      <Text style={s.upstageLabel}>UPSTAGE</Text>
      <View style={s.stage}>
        {/* Grid */}
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

        {/* Performer dots */}
        {choreo.performers.map((p) => {
          const st = f.states[p.id];
          if (!st) return null;
          const x = (st.position.x + stageMeters / 2) * pxPerMeter;
          const y = (st.position.y + stageMeters / 2) * pxPerMeter;
          return (
            <View
              key={p.id}
              style={[
                s.dot,
                {
                  left: x - DOT_R,
                  top: y - DOT_R,
                  backgroundColor: p.color,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Axis tick labels */}
      {ticks.map((m) => {
        const offsetPx = (m + stageMeters / 2) * pxPerMeter;
        return (
          <View key={`tick-${m}`}>
            {/* X-axis label below stage */}
            <Text
              style={[
                s.axisLabel,
                { left: AXIS_PAD + offsetPx - 7, top: AXIS_PAD + STAGE_PX + 2 },
              ]}
            >
              {m}
            </Text>
            {/* Y-axis label left of stage (Cartesian: y up) */}
            <Text
              style={[
                s.axisLabelLeft,
                { left: 0, top: AXIS_PAD + offsetPx - 3 },
              ]}
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

function FormationBlock({ choreo, f }: { choreo: Choreography; f: Formation }) {
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
        <StageThumbnail choreo={choreo} f={f} />
        <View style={s.notes}>
          <Text>{f.notes || '—'}</Text>
        </View>
      </View>
    </View>
  );
}

function ChoreoDocument({ choreo }: { choreo: Choreography }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>{choreo.title}</Text>
        <Text style={s.meta}>
          {choreo.performers.length} performers · {choreo.formations.length} formations ·{' '}
          stage {choreo.stage.width}×{choreo.stage.width}m
          {choreo.audio ? ` · audio: ${choreo.audio.name}` : ''}
        </Text>
        {choreo.formations.map((f) => (
          <FormationBlock key={f.id} choreo={choreo} f={f} />
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
