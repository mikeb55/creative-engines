/**
 * V102 — Tritonic realisation + MusicContext export.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import * as behaviourLayer from './tritonicBehaviourLayer';
import { buildTritonicDictionary } from './tritonicCell';
import {
  realiseTritonic,
  realisationToMusicContext,
  resolveWayneBehaviourForRealisation,
} from './tritonicRealisation';

function defaultCtx(overrides: Partial<Parameters<typeof realiseTritonic>[0]> = {}) {
  const dict = buildTritonicDictionary();
  return {
    mode: 'bb' as const,
    cells: dict.cells,
    behaviourOptions: {
      oddityScore: 0.5,
      delayedResolution: false,
      melodyPriority: false,
    },
    ...overrides,
  };
}

describe('realiseTritonic', () => {
  it('BB mode produces phrases with >= 4 cells', () => {
    const result = realiseTritonic(defaultCtx({ mode: 'bb' }));
    const cellCount = result.phrases.flat().length;
    expect(cellCount).toBeGreaterThanOrEqual(4);
    expect(result.mode).toBe('bb');
    expect(result.checksum.length).toBeGreaterThan(0);
  });

  it('SQ mode produces phrases with <= 3 cells each', () => {
    const result = realiseTritonic(defaultCtx({ mode: 'sq' }));
    expect(result.phrases.length).toBeGreaterThan(0);
    for (const phrase of result.phrases) {
      expect(phrase.length).toBeLessThanOrEqual(3);
      expect(phrase.length).toBeGreaterThan(0);
    }
  });

  it('ECM mode always applies delayedResolution', () => {
    const spy = jest.spyOn(behaviourLayer, 'applyWayneBehaviour');
    realiseTritonic(
      defaultCtx({
        mode: 'ecm',
        behaviourOptions: {
          oddityScore: 0,
          delayedResolution: false,
          melodyPriority: false,
        },
      }),
    );
    expect(spy).toHaveBeenCalled();
    for (const call of spy.mock.calls) {
      expect(call[1]?.delayedResolution).toBe(true);
    }
    spy.mockRestore();
  });

  it('all 3 modes produce non-empty phrases', () => {
    for (const mode of ['bb', 'sq', 'ecm'] as const) {
      const result = realiseTritonic(defaultCtx({ mode }));
      expect(result.phrases.length).toBeGreaterThan(0);
      expect(result.phrases.flat().length).toBeGreaterThan(0);
    }
  });

  it('resolveWayneBehaviourForRealisation forces ECM delayedResolution', () => {
    const resolved = resolveWayneBehaviourForRealisation('ecm', {
      oddityScore: 0.2,
      delayedResolution: false,
      melodyPriority: true,
    });
    expect(resolved.delayedResolution).toBe(true);
  });
});

describe('realisationToMusicContext', () => {
  it('checksum matches normalised bars', () => {
    const result = realiseTritonic(defaultCtx({ mode: 'sq' }));
    const mc = realisationToMusicContext(result, 0);
    const expected = computeMusicContextChecksum(mc.harmony.bars.map(normalizeChordSymbol));
    expect(mc.harmony.checksum).toBe(expected);
    expect(mc.harmony.bars).toEqual(mc.harmony.bars.map(normalizeChordSymbol));
  });

  it("provenance.sourceEngineId === 'tritonic'", () => {
    const result = realiseTritonic(defaultCtx({ mode: 'ecm' }));
    const mc = realisationToMusicContext(result, 7);
    expect(mc.provenance?.sourceEngineId).toBe('tritonic');
    expect(mc.harmony.bars.length).toBeGreaterThan(0);
    expect(typeof mc.provenance?.capturedAt).toBe('number');
  });
});
