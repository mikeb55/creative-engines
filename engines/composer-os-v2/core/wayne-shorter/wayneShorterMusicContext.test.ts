/**
 * Wayne Shorter MusicContext producer (V104p7).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import { callWayneShorterBridgeSync } from './wayneShorterEngineBridge';
import {
  buildMusicContextFromWayneShorter,
  buildMusicContextFromWayneShorterBridgeResult,
  buildMusicContextFromWayneShorterHarmony,
} from './wayneShorterMusicContextProducer';

describe('buildMusicContextFromWayneShorterHarmony', () => {
  it('normalises bars, checksum-after-norm, wayne_shorter provenance + receipt', () => {
    const ctx = buildMusicContextFromWayneShorterHarmony({
      title: 'Footprints',
      harmonyBars: ['E-7', 'A7alt'],
      seed: 42,
      bpm: 96,
      profile: 'balanced',
    });
    const expectedBars = ['Em7', 'A7alt'];
    expect(ctx.harmony.bars).toEqual(expectedBars);
    expect(ctx.harmony.checksum).toBe(computeMusicContextChecksum(expectedBars));
    expect(ctx.provenance?.sourceEngineId).toBe('wayne_shorter');
    expect(ctx.presetId).toBe('wayne_shorter');
    expect(ctx.receipts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          engine: 'wayne_shorter',
          kind: 'wayne_shorter_realisation_complete',
        }),
      ]),
    );
  });
});

describe('buildMusicContextFromWayneShorterBridgeResult', () => {
  it('checksum matches normalised harmony bars', () => {
    const bridge = {
      ok: true,
      harmonyBars: ['Dm7', 'G7'],
      tempo: 120,
      title: 'Test',
      profile: 'balanced',
      form: 'AABA',
      barCount: 2,
      seed: 7,
      stderrExcerpt: '',
    };
    const ctx = buildMusicContextFromWayneShorterBridgeResult(bridge);
    const norm = bridge.harmonyBars.map(normalizeChordSymbol);
    expect(ctx.harmony.bars).toEqual(norm);
    expect(ctx.harmony.checksum).toBe(computeMusicContextChecksum(norm));
  });
});

describe('Wayne Shorter Python bridge integration', () => {
  const bridge = callWayneShorterBridgeSync({
    title: 'Footprints',
    seed: 4242,
    profile: 'balanced',
  });

  const pythonAvailable = bridge.ok && bridge.harmonyBars.length > 0;

  (pythonAvailable ? it : it.skip)('buildMusicContextFromWayneShorter via py bridge', () => {
    const ctx = buildMusicContextFromWayneShorter({
      title: 'Footprints',
      seed: 4242,
      profile: 'balanced',
    });
    expect(ctx.provenance?.sourceEngineId).toBe('wayne_shorter');
    expect(ctx.harmony.bars.length).toBeGreaterThan(0);
    expect(ctx.harmony.checksum).toBe(
      computeMusicContextChecksum(ctx.harmony.bars.map(normalizeChordSymbol)),
    );
    expect(ctx.receipts.some((r) => r.kind === 'wayne_shorter_realisation_complete')).toBe(true);
  });
});
