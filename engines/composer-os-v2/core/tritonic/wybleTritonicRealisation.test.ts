/**
 * V105p3 — Wyble × Tritonic anchor feed + MusicContext producer.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { buildMusicContextFromWyble, computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import {
  anchorDescriptorFromWybleBar,
  behaviourBiasesFromAnchorDescriptor,
} from './tritonicAnchorDescriptor';
import { NEUTRAL_TRITONIC_BEHAVIOUR_BIAS } from './tritonicBehaviourBiases';
import {
  buildMusicContextFromWybleTritonic,
  isWybleMusicContext,
  realiseTritonicFromWyble,
} from './wybleTritonicRealisation';

function sampleWybleCtx(bars: string[] = ['Cmaj7', 'A7alt', 'Dm7b5', 'G7']) {
  return buildMusicContextFromWyble(bars, { key: 'C', bpm: 96, totalBars: bars.length });
}

describe('anchorDescriptorFromWybleBar', () => {
  it('preserves voicing density beyond bare symbol for extensions', () => {
    const dense = anchorDescriptorFromWybleBar('Cmaj9#11');
    expect(dense.voicingDensity).toBe('extension_dense');
    expect(dense.extensionSet.length).toBeGreaterThan(0);
  });

  it('maps 7alt to altered family with higher tension steering', () => {
    const alt = anchorDescriptorFromWybleBar('A7alt');
    expect(alt.qualityFamily).toBe('dominant_altered');
    const biases = behaviourBiasesFromAnchorDescriptor(alt);
    expect(biases.tension).toBeGreaterThan(NEUTRAL_TRITONIC_BEHAVIOUR_BIAS);
    expect(biases.resolutionDelay).toBeGreaterThan(NEUTRAL_TRITONIC_BEHAVIOUR_BIAS);
  });

  it('maps maj7#11 toward registral spread', () => {
    const lyd = anchorDescriptorFromWybleBar('Fmaj7#11');
    const biases = behaviourBiasesFromAnchorDescriptor(lyd);
    expect(biases.registralSpread).toBeGreaterThan(NEUTRAL_TRITONIC_BEHAVIOUR_BIAS);
  });

  it('maps m7b5 toward reduced spread', () => {
    const half = anchorDescriptorFromWybleBar('Dm7b5');
    const biases = behaviourBiasesFromAnchorDescriptor(half);
    expect(biases.registralSpread).toBeLessThan(NEUTRAL_TRITONIC_BEHAVIOUR_BIAS);
  });

  it('shell voicing raises anchor adhesion', () => {
    const shell = anchorDescriptorFromWybleBar('G7');
    expect(shell.voicingDensity).toBe('shell');
    const biases = behaviourBiasesFromAnchorDescriptor(shell);
    expect(biases.anchorAdhesion).toBeGreaterThan(NEUTRAL_TRITONIC_BEHAVIOUR_BIAS);
  });
});

describe('realiseTritonicFromWyble', () => {
  it('requires Wyble MusicContext', () => {
    expect(() =>
      realiseTritonicFromWyble({
        schemaVersion: '1.0',
        seed: 0,
        presetId: 'vault',
        key: { root: 'C', mode: 'major' },
        meter: { beats: 4, beatType: 4 },
        bpm: 120,
        totalBars: 4,
        harmony: { bars: ['Cmaj7'], checksum: 'x', source: 'user' },
        receipts: [],
      }),
    ).toThrow(/Wyble MusicContext/);
  });

  it('keeps anchor checksum and emits receipt metrics', () => {
    const wyble = sampleWybleCtx();
    const result = realiseTritonicFromWyble(wyble);
    expect(result.anchorBars.length).toBe(4);
    expect(result.anchorChecksum).toBe(wyble.harmony.checksum);
    expect(result.receiptMetrics.anchorDescriptorCount).toBe(4);
    expect(result.receiptMetrics.phraseCommitCount).toBeGreaterThan(0);
    expect(result.phrases.flat().length).toBe(4);
  });
});

describe('buildMusicContextFromWybleTritonic', () => {
  it('harmony.checksum matches normalised Wyble bars', () => {
    const wyble = sampleWybleCtx(['Dm7', 'G7', 'Cmaj7', 'Cmaj7']);
    const ctx = buildMusicContextFromWybleTritonic(wyble);
    const expected = computeMusicContextChecksum(ctx.harmony.bars.map(normalizeChordSymbol));
    expect(ctx.harmony.checksum).toBe(expected);
    expect(ctx.harmony.bars).toEqual(wyble.harmony.bars.map(normalizeChordSymbol));
    expect(ctx.harmony.checksum).toBe(wyble.harmony.checksum);
  });

  it("provenance.sourceEngineId === 'wyble_tritonic'", () => {
    const ctx = buildMusicContextFromWybleTritonic(sampleWybleCtx());
    expect(isWybleMusicContext({ ...ctx, provenance: { sourceEngineId: 'wyble', capturedAt: 0 } })).toBe(true);
    expect(ctx.provenance?.sourceEngineId).toBe('wyble_tritonic');
  });

  it('receipt kind wyble_tritonic_realisation_complete carries metrics', () => {
    const ctx = buildMusicContextFromWybleTritonic(sampleWybleCtx());
    const receipt = ctx.receipts.find((r) => r.kind === 'wyble_tritonic_realisation_complete');
    expect(receipt?.engine).toBe('wyble_tritonic');
    expect(receipt?.payload).toMatchObject({
      anchorDescriptorCount: 4,
      meanCellTension: expect.any(Number),
      phraseCommitCount: expect.any(Number),
      unresolvedCarryRate: expect.any(Number),
    });
  });
});
