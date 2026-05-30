/**
 * SY dual-guitar custom tuning MusicContext producer (V106p3).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import { buildMusicContextFromSYTuning } from './syTuningProducer';
import { resolveDualGuitarTuningPair, SY_TUNING_CATALOG } from './syTuningPresetCatalog';
import { adjacentStringBlocks } from './syTuningShapeHarmony';
import { resolveSYTuningLowerGuitarRoles } from './syTuningLowerGuitar';
import { realiseSYTuningMusicContext } from './syTuningRealisation';
import type { SYTuningPreset } from './syTuningTypes';

function samplePreset(overrides?: Partial<SYTuningPreset>): SYTuningPreset {
  return {
    tuningId: 'f_sharp_unison',
    archetype: 'mass_mass',
    seed: 10603,
    totalBars: 8,
    ...overrides,
  };
}

describe('buildMusicContextFromSYTuning', () => {
  it('returns valid MusicContext with sy_tuning provenance', () => {
    const ctx = buildMusicContextFromSYTuning(samplePreset());
    expect(ctx.schemaVersion).toBe('1.0');
    expect(ctx.presetId).toBe('sy_tuning');
    expect(ctx.provenance?.sourceEngineId).toBe('sy_tuning');
    expect(ctx.totalBars).toBe(8);
    expect(ctx.harmony.bars.length).toBe(8);
    expect(ctx.tuning?.name).toBe('f_sharp_unison');
  });

  it('harmony.checksum matches normalised bars', () => {
    const ctx = buildMusicContextFromSYTuning(samplePreset({ seed: 42 }));
    const expected = computeMusicContextChecksum(ctx.harmony.bars.map(normalizeChordSymbol));
    expect(ctx.harmony.checksum).toBe(expected);
    expect(ctx.harmony.bars).toEqual(ctx.harmony.bars.map(normalizeChordSymbol));
  });

  it('receipt sy_tuning_realisation_complete carries shape metrics', () => {
    const ctx = buildMusicContextFromSYTuning(samplePreset({ seed: 99 }));
    const receipt = ctx.receipts.find((r) => r.kind === 'sy_tuning_realisation_complete');
    expect(receipt?.engine).toBe('sy_tuning');
    const payload = receipt?.payload as Record<string, unknown>;
    expect(typeof payload.openStringResonanceRatio).toBe('number');
    expect(typeof payload.shapeRedundancyScore).toBe('number');
    expect(typeof payload.clusterIdentityScore).toBe('number');
    expect(typeof payload.retuneDependenceIndex).toBe('number');
    expect(typeof payload.resonanceContinuityMetric).toBe('number');
    expect(typeof payload.parallelShapeUsage).toBe('number');
    expect(typeof payload.tertianNormalizationPenalty).toBe('number');
    expect(payload.harmonyChecksum).toBe(ctx.harmony.checksum);
    expect(payload.tuningId).toBe('f_sharp_unison');
    expect(payload.archetype).toBe('mass_mass');
  });

  it('same seed produces identical harmony checksum', () => {
    const a = buildMusicContextFromSYTuning(samplePreset({ seed: 777 }));
    const b = buildMusicContextFromSYTuning(samplePreset({ seed: 777 }));
    expect(a.harmony.checksum).toBe(b.harmony.checksum);
    expect(a.harmony.bars).toEqual(b.harmony.bars);
  });

  it('different seed can change harmony output', () => {
    const a = buildMusicContextFromSYTuning(samplePreset({ seed: 1 }));
    const b = buildMusicContextFromSYTuning(samplePreset({ seed: 2 }));
    const same =
      a.harmony.checksum === b.harmony.checksum &&
      a.harmony.bars.every((bar, i) => bar === b.harmony.bars[i]);
    expect(same).toBe(false);
  });

  it('mass_knife archetype pairs narrow + cluster tunings', () => {
    const ctx = buildMusicContextFromSYTuning(
      samplePreset({ archetype: 'mass_knife', tuningId: 'narrow_consonant' }),
    );
    const receipt = ctx.receipts[0]?.payload as Record<string, unknown>;
    expect(receipt.guitar1TuningId).toBe('narrow_consonant');
    expect(receipt.guitar2TuningId).toBe('cluster_friction');
  });

  it('drone_shard archetype pairs drone + cluster tunings', () => {
    const ctx = buildMusicContextFromSYTuning(samplePreset({ archetype: 'drone_shard' }));
    const receipt = ctx.receipts[0]?.payload as Record<string, unknown>;
    expect(receipt.guitar1TuningId).toBe('drone_melody');
    expect(receipt.guitar2TuningId).toBe('cluster_friction');
  });

  it('drone_melody preset elevates guide_tone_lane vs cluster_friction', () => {
    const drone = realiseSYTuningMusicContext(
      samplePreset({ tuningId: 'drone_melody', archetype: 'drone_shard', seed: 5001 }),
    );
    const cluster = realiseSYTuningMusicContext(
      samplePreset({ tuningId: 'cluster_friction', archetype: 'mass_knife', seed: 5001 }),
    );
    expect(drone.receipt.lowerGuitarRoleDistribution.guide_tone_lane).toBeGreaterThan(
      cluster.receipt.lowerGuitarRoleDistribution.guide_tone_lane,
    );
  });

  it('wyble anchor bars steer export symbols without tertian cadences', () => {
    const ctx = buildMusicContextFromSYTuning(
      samplePreset({
        wybleAnchorBars: ['Fsus2', 'Gsus4', 'Asus2', 'Bsus4'],
        seed: 88001,
      }),
    );
    expect(ctx.harmony.bars.every((b) => !/maj7|m7|7$/.test(b))).toBe(true);
  });
});

describe('SY tuning catalog', () => {
  it('registers five presets with spec MIDI strings', () => {
    expect(SY_TUNING_CATALOG.f_sharp_unison.strings).toEqual([42, 42, 54, 54, 64, 71]);
    expect(SY_TUNING_CATALOG.doubled_fifths.strings).toEqual([43, 43, 50, 50, 57, 57]);
    expect(SY_TUNING_CATALOG.narrow_consonant.strings).toEqual([45, 45, 48, 48, 55, 55]);
    expect(SY_TUNING_CATALOG.cluster_friction.strings).toEqual([45, 48, 48, 55, 56, 60]);
    expect(SY_TUNING_CATALOG.drone_melody.strings).toEqual([36, 43, 50, 55, 60, 62]);
  });

  it('cluster_friction tuning has built-in minor-second adjacent blocks', () => {
    const blocks = adjacentStringBlocks(SY_TUNING_CATALOG.cluster_friction.strings);
    expect(blocks.some((b) => b.interval === 1 || b.interval === 2)).toBe(true);
  });
});

describe('resolveSYTuningLowerGuitarRoles', () => {
  it('assigns lower-guitar roles for shape plans', () => {
    const result = realiseSYTuningMusicContext(samplePreset({ seed: 3030 }));
    expect(result.lowerGuitarBars.length).toBe(8);
    expect(result.lowerGuitarBars.every((b) => b.role.length > 0)).toBe(true);
    const pedalCount = result.lowerGuitarBars.filter((b) => b.role === 'pedal').length;
    expect(pedalCount).toBeGreaterThan(0);
  });
});

describe('resolveDualGuitarTuningPair', () => {
  it('mass_mass uses same tuning on both guitars', () => {
    const pair = resolveDualGuitarTuningPair('mass_mass', 'doubled_fifths');
    expect(pair.guitar1.id).toBe('doubled_fifths');
    expect(pair.guitar2.id).toBe('doubled_fifths');
  });
});
