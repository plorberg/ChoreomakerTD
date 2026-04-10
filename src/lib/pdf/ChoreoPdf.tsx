'use client';

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { Choreography, Formation } from '@/domain/choreo';

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
  row: { flexDirection: 'row', gap: 12 },
  stage: {
    width: 220,
    height: 170,
    border: '1pt solid #888',
    position: 'relative',
    backgroundColor: '#f6f6f6',
  },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
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

function FormationBlock({ choreo, f }: { choreo: Choreography; f: Formation }) {
  const stageW = 220;
  const stageH = 170;
  return (
    <View style={s.formation} wrap={false}>
      <Text style={s.fTitle}>
        {f.index + 1}. {f.name}
      </Text>
      <Text style={s.fMeta}>
        Time {f.timeSec.toFixed(1)}s · {f.counts ?? 0} counts
      </Text>
      <View style={s.row}>
        <View style={s.stage}>
          {choreo.performers.map((p) => {
            const st = f.states[p.id];
            if (!st) return null;
            const nx = (st.position.x + choreo.stage.width / 2) / choreo.stage.width;
            const ny = (st.position.y + choreo.stage.height / 2) / choreo.stage.height;
            return (
              <View
                key={p.id}
                style={[
                  s.dot,
                  {
                    left: nx * stageW - 5,
                    top: ny * stageH - 5,
                    backgroundColor: p.color,
                  },
                ]}
              />
            );
          })}
        </View>
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
          {choreo.performers.length} performers · {choreo.formations.length} formations
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
