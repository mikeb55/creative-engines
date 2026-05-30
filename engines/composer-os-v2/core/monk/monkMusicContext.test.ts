/**
 * Monk MusicContext producer (V105p5).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import { callMonkBridgeSync } from './monkEngineBridge';
import {
  buildMusicContextFromMonk,
  buildMusicContextFromMonkBridgeResult,
  buildMusicContextFromMonkHarmony,
} from './monkMusicContextProducer';

describe('buildMusicContextFromMonkHarmony', () => {
  it('normalises bars, checksum-after-norm, monk provenance + receipt', () => {
    const ctx = buildMusicContextFromMonkHarmony({
      title: 'Blue Monk',
      harmonyBars: ['Bb7', 'Eb7', 'F7', 'Bb7'],
      seed: 42,
      bpm: 120,
      profile: 'angular',
      metrics: {
        chromaticNeighbourRate: 0.25,
        tritoneShiftCount: 1,
        rhythmicMotifConsistency: 0.5,
        dissonanceResolutionScore: 0.6,
      },
    });
    const expectedBars = ['Bb7', 'Eb7', 'F7', 'Bb7'];
    expect(ctx.harmony.bars).toEqual(expectedBars);
    expect(ctx.harmony.checksum).toBe(computeMusicContextChecksum(expectedBars));
    expect(ctx.provenance?.sourceEngineId).toBe('monk');
    expect(ctx.presetId).toBe('monk');
    expect(ctx.receipts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          engine: 'monk',
          kind: 'monk_realisation_complete',
          payload: expect.objectContaining({
            chromaticNeighbourRate: 0.25,
            tritoneShiftCount: 1,
            rhythmicMotifConsistency: 0.5,
            dissonanceResolutionScore: 0.6,
          }),
        }),
      ]),
    );
  });
});

describe('buildMusicContextFromMonkBridgeResult', () => {
  it('checksum matches normalised harmony bars', () => {
    const bridge = {
      ok: true,
      harmonyBars: ['Dm7', 'Db7', 'C7', 'F7'],
      tempo: 120,
      title: 'Test',
      profile: 'angular',
      form: 'AABA',
      barCount: 4,
      seed: 7,
      stderrExcerpt: '',
      chromaticNeighbourRate: 0.33,
      tritoneShiftCount: 1,
      rhythmicMotifConsistency: 0.4,
      dissonanceResolutionScore: 0.55,
    };
    const ctx = buildMusicContextFromMonkBridgeResult(bridge);
    const norm = bridge.harmonyBars.map(normalizeChordSymbol);
    expect(ctx.harmony.bars).toEqual(norm);
    expect(ctx.harmony.checksum).toBe(computeMusicContextChecksum(norm));
  });
});

describe('Monk Python bridge integration', () => {
  const bridge = callMonkBridgeSync({
    title: 'Blue Monk',
    seed: 4242,
    profile: 'angular',
  });

  const pythonAvailable = bridge.ok && bridge.harmonyBars.length > 0;

  (pythonAvailable ? it : it.skip)('buildMusicContextFromMonk via py bridge', () => {
    const ctx = buildMusicContextFromMonk({
      title: 'Blue Monk',
      seed: 4242,
      profile: 'angular',
    });
    expect(ctx.provenance?.sourceEngineId).toBe('monk');
    expect(ctx.harmony.bars.length).toBeGreaterThan(0);
    expect(ctx.harmony.checksum).toBe(
      computeMusicContextChecksum(ctx.harmony.bars.map(normalizeChordSymbol)),
    );
    const receipt = ctx.receipts.find((r) => r.kind === 'monk_realisation_complete');
    expect(receipt?.payload).toMatchObject({
      chromaticNeighbourRate: expect.any(Number),
      tritoneShiftCount: expect.any(Number),
      rhythmicMotifConsistency: expect.any(Number),
      dissonanceResolutionScore: expect.any(Number),
    });
  });
});
