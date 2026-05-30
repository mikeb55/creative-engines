/**
 * V1.5p9 — Tritonic monitor snapshot tests.
 */

import { buildTritonicDictionary } from './tritonicCell';
import { buildTritonicMonitorSnapshot } from './tritonicMonitorSnapshot';
import { buildMusicContextFromTritonicMelody } from './tritonicMelody';
import { scheduleTritonicTimeline } from './tritonicTimeline';
import { projectedStrandMidisFromCells } from './tritonicStrands';
import { computeTritonicMusicalDiagnostics } from './tritonicDiagnostics';

describe('buildTritonicMonitorSnapshot', () => {
  it('builds one column per cell with colour and strand midis', () => {
    const dict = buildTritonicDictionary();
    const cells = dict.cells.slice(0, 4);
    const timeline = scheduleTritonicTimeline(cells, 'sq', { barCount: 6 });
    const strandMidis = projectedStrandMidisFromCells(cells);
    const { diagnostics, phraseState } = computeTritonicMusicalDiagnostics({
      cells,
      timeline,
      harmonyBars: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
      strandMidis,
    });
    const snap = buildTritonicMonitorSnapshot({
      timeline,
      cells,
      harmonyBars: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
      phraseState,
      diagnostics,
      mode: 'sq',
    });
    expect(snap.columns).toHaveLength(4);
    expect(snap.columns[0]?.anchorSymbol).toBe('Cmaj7');
    expect(snap.columns[0]?.cellGlyph.length).toBeGreaterThan(2);
    expect(['stable', 'colouristic', 'unresolved', 'cadence-eligible']).toContain(
      snap.columns[0]?.colourState,
    );
    expect(snap.tensionSeries).toHaveLength(4);
  });
});

describe('tritonic_melody_complete monitorSnapshot', () => {
  it('receipt stores monitorSnapshot columns', () => {
    const dict = buildTritonicDictionary();
    const mc = buildMusicContextFromTritonicMelody(
      {
        mode: 'sq',
        cells: dict.cells,
        behaviourOptions: { oddityScore: 0.2, delayedResolution: false, melodyPriority: true },
      },
      0,
    );
    const receipt = mc.receipts.find((r) => r.kind === 'tritonic_melody_complete');
    const payload = receipt?.payload as { monitorSnapshot?: { columns: unknown[] } };
    expect(payload?.monitorSnapshot?.columns?.length).toBeGreaterThan(0);
  });
});
