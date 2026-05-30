/**
 * Population Composer MusicContext producer (V106p1).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import { buildMusicContextFromPopulation } from './populationComposerProducer';
import type { PopulationComposerPreset } from './populationComposerTypes';
import { phaseForBar, runPopulationSelection, totalBarsFromDramaticArc } from './populationComposerSelection';

function samplePreset(overrides?: Partial<PopulationComposerPreset>): PopulationComposerPreset {
  return {
    producers: ['tritonic', 'monk', 'wayne_shorter', 'vault', 'big_band'],
    dramaticArc: [
      { startBar: 1, endBar: 4, phase: 'build' },
      { startBar: 5, endBar: 6, phase: 'suspend' },
      { startBar: 7, endBar: 8, phase: 'cadence' },
    ],
    seed: 10601,
    key: 0,
    ...overrides,
  };
}

describe('buildMusicContextFromPopulation', () => {
  it('returns valid MusicContext with population_composer provenance', () => {
    const ctx = buildMusicContextFromPopulation(samplePreset());
    expect(ctx.schemaVersion).toBe('1.0');
    expect(ctx.presetId).toBe('population_composer');
    expect(ctx.provenance?.sourceEngineId).toBe('population_composer');
    expect(ctx.totalBars).toBe(8);
    expect(ctx.harmony.bars.length).toBe(8);
  });

  it('harmony.checksum matches normalised bars', () => {
    const ctx = buildMusicContextFromPopulation(samplePreset({ seed: 42 }));
    const expected = computeMusicContextChecksum(ctx.harmony.bars.map(normalizeChordSymbol));
    expect(ctx.harmony.checksum).toBe(expected);
    expect(ctx.harmony.bars).toEqual(ctx.harmony.bars.map(normalizeChordSymbol));
  });

  it('receipt population_composer_realisation_complete carries ecology fields', () => {
    const ctx = buildMusicContextFromPopulation(samplePreset({ seed: 99 }));
    const receipt = ctx.receipts.find((r) => r.kind === 'population_composer_realisation_complete');
    expect(receipt?.engine).toBe('population_composer');
    const payload = receipt?.payload as Record<string, unknown>;
    expect(typeof payload.generationCount).toBe('number');
    expect(typeof payload.dominantProducer).toBe('string');
    expect(Array.isArray(payload.producerWeightHistory)).toBe(true);
    expect(typeof payload.dramaticArcCompliance).toBe('number');
    expect(payload.dramaticArcCompliance).toBeGreaterThanOrEqual(0);
    expect(payload.dramaticArcCompliance).toBeLessThanOrEqual(1);
    expect(payload.harmonyChecksum).toBe(ctx.harmony.checksum);
  });

  it('same seed produces identical harmony checksum', () => {
    const a = buildMusicContextFromPopulation(samplePreset({ seed: 777 }));
    const b = buildMusicContextFromPopulation(samplePreset({ seed: 777 }));
    expect(a.harmony.checksum).toBe(b.harmony.checksum);
    expect(a.harmony.bars).toEqual(b.harmony.bars);
  });

  it('different seed can change harmony output', () => {
    const a = buildMusicContextFromPopulation(samplePreset({ seed: 1 }));
    const b = buildMusicContextFromPopulation(samplePreset({ seed: 2 }));
    const same =
      a.harmony.checksum === b.harmony.checksum &&
      a.harmony.bars.every((bar, i) => bar === b.harmony.bars[i]);
    expect(same).toBe(false);
  });

  it('defaults inheritancePressure contrastWeight mutationRate when omitted', () => {
    const ctx = buildMusicContextFromPopulation({
      producers: ['vault', 'monk'],
      dramaticArc: [{ startBar: 1, endBar: 4, phase: 'build' }],
      seed: 5,
    });
    expect(ctx.totalBars).toBe(4);
    expect(ctx.receipts.length).toBe(1);
  });

  it('throws when no valid producers', () => {
    expect(() =>
      buildMusicContextFromPopulation({
        producers: [],
        dramaticArc: [{ startBar: 1, endBar: 4, phase: 'build' }],
      }),
    ).toThrow(/at least one valid producer/);
  });
});

describe('runPopulationSelection', () => {
  it('maps dramatic arc phases to bars', () => {
    const arc = [
      { startBar: 1, endBar: 2, phase: 'build' as const },
      { startBar: 3, endBar: 4, phase: 'fracture' as const },
    ];
    expect(phaseForBar(0, arc)).toBe('build');
    expect(phaseForBar(2, arc)).toBe('fracture');
    expect(totalBarsFromDramaticArc(arc)).toBe(4);
  });

  it('tracks per-bar winners and weight history', () => {
    const result = runPopulationSelection(samplePreset({ seed: 3003 }));
    expect(result.perBarWinners.length).toBe(8);
    expect(result.producerWeightHistory.length).toBe(8);
    expect(result.generationCount).toBe(8);
    expect(result.dominantProducer).toBeTruthy();
  });
});
