/**
 * V102 — Tritonic realisation + MusicContext export.
 * V104p1 — Vault-anchored tritonic realisation.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  buildMusicContextFromVaultOutput,
  computeMusicContextChecksum,
} from '../music-context/musicContextAdapters';
import type { ParsedChart } from '../irealpro/parsedChart';
import type { IRealVaultOutput } from '../irealpro/irealVaultPipeline';
import * as behaviourLayer from './tritonicBehaviourLayer';
import { buildTritonicDictionary } from './tritonicCell';
import {
  anchorRootPcFromSymbol,
  buildMusicContextFromVaultTritonic,
  floatCellAboveAnchor,
  isVaultMusicContext,
  realiseTritonic,
  realiseTritonicFromVault,
  realisationToMusicContext,
  resolveWayneBehaviourForRealisation,
  vaultAnchoredTritonicToMusicContext,
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

function mockVaultChart(harmonies: string[]): ParsedChart {
  return {
    title: 'Tritonic Vault',
    composer: '',
    key: 'Bb major',
    meter: { num: 4, den: 4 },
    timeSignature: { num: 4, den: 4 },
    harmonies,
    barMeterMap: {},
    repeatMarkers: [],
    tempo: 120,
    style: null,
    sections: [],
    measures: harmonies.map(() => []),
    repeats: [],
  };
}

function mockVaultOutput(): IRealVaultOutput {
  return {
    title: 'Tritonic Vault',
    key: 'Bb',
    bars: 4,
    generatedNotes: [],
    chordMappings: [],
    unmappedChords: [],
    mode: 'solo',
    seed: 42001,
  };
}

function vaultMusicContext(harmonies: string[]) {
  return buildMusicContextFromVaultOutput(mockVaultOutput(), mockVaultChart(harmonies));
}

describe('Vault × Tritonic integration (v1.4p1)', () => {
  it('isVaultMusicContext detects vault provenance', () => {
    const vaultCtx = vaultMusicContext(['Bb7', 'Eb7', 'Bb7', 'F7']);
    expect(isVaultMusicContext(vaultCtx)).toBe(true);
    const standalone = realisationToMusicContext(realiseTritonic(defaultCtx()), 0);
    expect(isVaultMusicContext(standalone)).toBe(false);
  });

  it('realiseTritonicFromVault produces one floating cell per anchor bar', () => {
    const anchors = ['Bb7', 'Eb7', 'Bb7', 'F7'];
    const vaultCtx = vaultMusicContext(anchors);
    const result = realiseTritonicFromVault(vaultCtx, defaultCtx({ mode: 'bb' }));
    expect(result.anchorBars).toEqual(anchors.map(normalizeChordSymbol));
    expect(result.phrases.flat()).toHaveLength(anchors.length);
    expect(result.anchorChecksum).toBe(vaultCtx.harmony.checksum);
  });

  it('vaultAnchoredTritonicToMusicContext preserves anchor checksum LOCK', () => {
    const anchors = ['Dm7', 'G7', 'Cmaj7', 'Am7'];
    const vaultCtx = vaultMusicContext(anchors);
    const result = realiseTritonicFromVault(vaultCtx, defaultCtx({ mode: 'sq' }));
    const mc = vaultAnchoredTritonicToMusicContext(vaultCtx, result);
    const normalised = mc.harmony.bars.map(normalizeChordSymbol);
    expect(mc.harmony.bars).toEqual(normalised);
    expect(mc.harmony.checksum).toBe(computeMusicContextChecksum(normalised));
    expect(mc.harmony.checksum).toBe(vaultCtx.harmony.checksum);
    expect(mc.harmony.bars).toEqual(anchors.map(normalizeChordSymbol));
  });

  it('buildMusicContextFromVaultTritonic appends tritonic receipt and hops provenance', () => {
    const vaultCtx = vaultMusicContext(['Cmaj7', 'Am7', 'Dm7', 'G7']);
    const mc = buildMusicContextFromVaultTritonic(vaultCtx, defaultCtx({ mode: 'ecm' }));
    expect(mc.provenance?.sourceEngineId).toBe('tritonic');
    expect(mc.presetId).toBe('tritonic_vault_ecm');
    expect(mc.receipts.some((r) => r.kind === 'vault_generation_complete')).toBe(true);
    expect(mc.receipts.some((r) => r.kind === 'tritonic_vault_realisation_complete')).toBe(true);
    const tritonicReceipt = mc.receipts.find((r) => r.kind === 'tritonic_vault_realisation_complete');
    expect(tritonicReceipt?.payload).toMatchObject({
      mode: 'ecm',
      anchorChecksum: vaultCtx.harmony.checksum,
      barCount: 4,
    });
  });

  it('floatCellAboveAnchor transposes by anchor root', () => {
    const dict = buildTritonicDictionary();
    const cell = dict.byFamily.bergonzi[0]!;
    const floated = floatCellAboveAnchor(cell, 'G7');
    expect(floated.notes).toHaveLength(3);
    expect(anchorRootPcFromSymbol('G7')).toBe(7);
    expect(floated.family).toBe(cell.family);
  });

  it('rejects non-vault MusicContext', () => {
    const mc = realisationToMusicContext(realiseTritonic(defaultCtx()), 0);
    expect(() => realiseTritonicFromVault(mc, defaultCtx())).toThrow(/Vault MusicContext/);
  });
});
