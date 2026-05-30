/**
 * Zappa Solo MusicContext producer (V106p2).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import { buildMusicContextFromZappaSolo } from './zappaSoloMusicContextProducer';
import { arcStateForBar } from './zappaSoloMusicContextRealisation';
import type { ZappaSoloMusicContextPreset } from './zappaSoloMusicContextTypes';

const ZAPPA_HARMONY_12 = [
  'Db7alt',
  'G7alt',
  'C#7alt',
  'F#7alt',
  'Bb7alt',
  'E7alt',
  'Ab7alt',
  'D7alt',
  'Gb7alt',
  'Cb7alt',
  'F7alt',
  'Ebmaj7#11',
];

function samplePreset(overrides?: Partial<ZappaSoloMusicContextPreset>): ZappaSoloMusicContextPreset {
  return {
    harmonyBars: ZAPPA_HARMONY_12,
    seed: 90441,
    bpm: 120,
    modalField: 'mixolydian',
    ...overrides,
  };
}

describe('buildMusicContextFromZappaSolo', () => {
  it('returns valid MusicContext with zappa_solo provenance', () => {
    const ctx = buildMusicContextFromZappaSolo(samplePreset());
    expect(ctx.schemaVersion).toBe('1.0');
    expect(ctx.presetId).toBe('zappa_solo');
    expect(ctx.provenance?.sourceEngineId).toBe('zappa_solo');
    expect(ctx.totalBars).toBe(12);
    expect(ctx.harmony.bars.length).toBe(12);
    expect(ctx.harmony.source).toBe('locked');
  });

  it('harmony.checksum matches normalised supplied bars', () => {
    const ctx = buildMusicContextFromZappaSolo(samplePreset({ seed: 42 }));
    const expected = computeMusicContextChecksum(ctx.harmony.bars.map(normalizeChordSymbol));
    expect(ctx.harmony.checksum).toBe(expected);
    expect(ctx.harmony.bars).toEqual(ZAPPA_HARMONY_12.map(normalizeChordSymbol));
  });

  it('does not mutate harmony — supplied bars preserved after normalisation', () => {
    const bars = ['Am7', 'D7', 'Gmaj7', 'Cmaj7'];
    const ctx = buildMusicContextFromZappaSolo(samplePreset({ harmonyBars: bars, seed: 1 }));
    expect(ctx.harmony.bars).toEqual(bars.map(normalizeChordSymbol));
  });

  it('receipt zappa_solo_realisation_complete carries ecology metrics', () => {
    const ctx = buildMusicContextFromZappaSolo(samplePreset({ seed: 90441 }));
    const receipt = ctx.receipts.find((r) => r.kind === 'zappa_solo_realisation_complete');
    expect(receipt?.engine).toBe('zappa_solo');
    const payload = receipt?.payload as Record<string, number | string>;
    expect(typeof payload.modalAnchorRatio).toBe('number');
    expect(typeof payload.motifMutationRecurrence).toBe('number');
    expect(typeof payload.rhythmicElasticityScore).toBe('number');
    expect(typeof payload.targetedDissonanceIndex).toBe('number');
    expect(typeof payload.closureRefusalScore).toBe('number');
    expect(typeof payload.conversationalAsymmetry).toBe('number');
    expect(payload.harmonyChecksum).toBe(ctx.harmony.checksum);
    expect(payload.participationLevel).toBe('primary');
  });

  it('same seed produces identical harmony checksum and motif', () => {
    const a = buildMusicContextFromZappaSolo(samplePreset({ seed: 777 }));
    const b = buildMusicContextFromZappaSolo(samplePreset({ seed: 777 }));
    expect(a.harmony.checksum).toBe(b.harmony.checksum);
    expect(a.motif?.intervalPattern).toEqual(b.motif?.intervalPattern);
  });

  it('primary participation attaches solo motif', () => {
    const ctx = buildMusicContextFromZappaSolo(samplePreset({ participationLevel: 'primary' }));
    expect(ctx.motif?.producer).toBe('zappa_solo');
    expect((ctx.motif?.intervalPattern.length ?? 0)).toBeGreaterThan(0);
  });

  it('tertiary participation — pitch colour only, harmony unchanged', () => {
    const ctx = buildMusicContextFromZappaSolo(
      samplePreset({ participationLevel: 'tertiary', harmonyBars: ['G7', 'C7', 'F7', 'Bb7'] }),
    );
    const receipt = ctx.receipts[0]?.payload as { participationLevel: string; noteCount: number };
    expect(receipt.participationLevel).toBe('tertiary');
    expect(ctx.harmony.bars.length).toBe(4);
  });

  it('throws when harmonyBars empty', () => {
    expect(() => buildMusicContextFromZappaSolo(samplePreset({ harmonyBars: [] }))).toThrow(
      /at least one harmony bar/,
    );
  });

  it('solo arc maps four dramatic states', () => {
    const arc = [
      { startBar: 1, endBar: 3, state: 'claim' as const },
      { startBar: 4, endBar: 6, state: 'agitation' as const },
      { startBar: 7, endBar: 9, state: 'fracture' as const },
      { startBar: 10, endBar: 12, state: 'crooked_landing' as const },
    ];
    expect(arcStateForBar(0, arc)).toBe('claim');
    expect(arcStateForBar(5, arc)).toBe('agitation');
    expect(arcStateForBar(11, arc)).toBe('crooked_landing');
    const ctx = buildMusicContextFromZappaSolo(samplePreset({ soloArc: arc }));
    expect(ctx.receipts[0]).toBeDefined();
  });
});
