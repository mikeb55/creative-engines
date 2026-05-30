/**
 * V104p4 — Tritonic diagnostics + state machine tests.
 */

import { buildMusicContextFromVaultOutput } from '../music-context/musicContextAdapters';
import type { ParsedChart } from '../irealpro/parsedChart';
import type { IRealVaultOutput } from '../irealpro/irealVaultPipeline';
import { buildTritonicDictionary } from './tritonicCell';
import {
  computeContourVariety,
  computeRhythmicOffsetDistribution,
  computeTritonicMusicalDiagnostics,
} from './tritonicDiagnostics';
import { buildMusicContextFromTritonicMelody } from './tritonicMelody';
import {
  buildMusicContextFromVaultTritonic,
  realiseTritonic,
} from './tritonicRealisation';
import { createTritonicStateMachine, runTritonicStateMachine } from './tritonicStateMachine';
import { scheduleTritonicTimeline } from './tritonicTimeline';
import { projectedStrandMidisFromCells } from './tritonicStrands';

function defaultCtx() {
  const dict = buildTritonicDictionary();
  return {
    mode: 'sq' as const,
    cells: dict.cells,
    behaviourOptions: {
      oddityScore: 0.2,
      delayedResolution: false,
      melodyPriority: true,
    },
  };
}

describe('TritonicStateMachine', () => {
  it('creates empty initial state', () => {
    const sm = createTritonicStateMachine();
    expect(sm.previousCell).toBeNull();
    expect(sm.unresolvedTones).toEqual([]);
    expect(sm.resolutionEligibility).toBe(1);
  });

  it('persists phrase memory across cell transitions', () => {
    const cells = buildTritonicDictionary().cells.slice(0, 4);
    const midis = projectedStrandMidisFromCells(cells);
    const final = runTritonicStateMachine({
      cells,
      strandMidis: midis,
      harmonyBars: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
    });
    expect(final.previousCell).toBe(cells[3]);
    expect(final.tensionArc.peak).toBeGreaterThanOrEqual(final.tensionArc.mean);
    expect(final.registralCentroid).toBeGreaterThan(0);
    expect(['step', 'leap', 'reversal', 'static']).toContain(final.lastContourType);
  });
});

describe('TritonicMusicalDiagnostics', () => {
  it('computes rhythmic offset distribution from timeline', () => {
    const cells = buildTritonicDictionary().cells.slice(0, 3);
    const timeline = scheduleTritonicTimeline(cells, 'sq', { barCount: 5 });
    const dist = computeRhythmicOffsetDistribution(timeline);
    expect(dist.downbeat + dist.weak + dist.offbeat).toBe(timeline.length);
  });

  it('contour variety is bounded 0..1', () => {
    expect(computeContourVariety([60, 62, 61, 63])).toBeGreaterThanOrEqual(0);
    expect(computeContourVariety([60, 62, 61, 63])).toBeLessThanOrEqual(1);
  });

  it('tritonic_melody_complete receipt carries musical diagnostics', () => {
    const mc = buildMusicContextFromTritonicMelody(defaultCtx(), 0);
    const receipt = mc.receipts.find((r) => r.kind === 'tritonic_melody_complete');
    expect(receipt?.payload).toMatchObject({
      unresolvedToneCount: expect.any(Number),
      contourVariety: expect.any(Number),
      cadenceStrength: expect.any(Number),
      rhythmicOffsetDistribution: expect.objectContaining({
        downbeat: expect.any(Number),
        weak: expect.any(Number),
        offbeat: expect.any(Number),
      }),
    });
  });

  it('tritonic_vault_realisation_complete receipt carries musical diagnostics', () => {
    const chart: ParsedChart = {
      title: 'Diag',
      composer: '',
      key: 'C',
      meter: { num: 4, den: 4 },
      timeSignature: { num: 4, den: 4 },
      harmonies: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
      barMeterMap: {},
      repeatMarkers: [],
      tempo: 120,
      style: null,
      sections: [],
      measures: Array.from({ length: 4 }, () => []),
      repeats: [],
    };
    const output: IRealVaultOutput = {
      title: 'Diag',
      key: 'C',
      bars: 4,
      generatedNotes: [],
      chordMappings: [],
      unmappedChords: [],
      mode: 'solo',
      seed: 1,
    };
    const vaultCtx = buildMusicContextFromVaultOutput(output, chart);
    const mc = buildMusicContextFromVaultTritonic(vaultCtx, defaultCtx());
    const receipt = mc.receipts.find((r) => r.kind === 'tritonic_vault_realisation_complete');
    expect(receipt?.payload).toMatchObject({
      unresolvedToneCount: expect.any(Number),
      contourVariety: expect.any(Number),
      cadenceStrength: expect.any(Number),
      rhythmicOffsetDistribution: expect.any(Object),
      phraseState: expect.objectContaining({
        tensionArc: expect.any(Object),
        resolutionEligibility: expect.any(Number),
      }),
    });
  });

  it('shared state machine path for harmony and melody realisation', () => {
    const cells = realiseTritonic(defaultCtx()).phrases.flat();
    const midis = projectedStrandMidisFromCells(cells);
    const timeline = scheduleTritonicTimeline(cells, 'sq');
    const harmonyDiag = computeTritonicMusicalDiagnostics({
      cells,
      timeline,
      harmonyBars: ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Fmaj7'].slice(0, cells.length),
      strandMidis: midis,
    });
    const melodyDiag = computeTritonicMusicalDiagnostics({
      cells,
      timeline,
      harmonyBars: ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Fmaj7'].slice(0, cells.length),
      strandMidis: midis,
    });
    expect(harmonyDiag.phraseState.previousCell).toEqual(melodyDiag.phraseState.previousCell);
    expect(harmonyDiag.diagnostics.contourVariety).toBe(melodyDiag.diagnostics.contourVariety);
  });
});
