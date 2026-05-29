/**
 * ECM chamber MusicContext producer (V101).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import { buildMusicContextFromEcm } from './ecmProducer';
import type { EcmChamberPreset, EcmChamberTexture, EcmChamberVoicing } from './ecmTypes';

function samplePreset(
  overrides: Partial<EcmChamberPreset> & Pick<EcmChamberPreset, 'texture'>
): EcmChamberPreset {
  return {
    key: 4,
    tempo: 72,
    voicing: 'mixed',
    ...overrides,
  };
}

describe('buildMusicContextFromEcm', () => {
  const textures: EcmChamberTexture[] = ['sparse', 'resonant', 'suspended'];

  it.each(textures)('returns valid MusicContext for texture %s', (texture) => {
    const ctx = buildMusicContextFromEcm(samplePreset({ texture }));
    expect(ctx.schemaVersion).toBe('1.0');
    expect(ctx.presetId).toBe('ecm_chamber');
    expect(ctx.harmony.bars.length).toBeGreaterThan(0);
    expect(ctx.totalBars).toBe(ctx.harmony.bars.length);
    expect(ctx.bpm).toBe(72);
    expect(ctx.receipts).toEqual([]);
  });

  it('harmony.checksum matches normalised bars', () => {
    const ctx = buildMusicContextFromEcm(samplePreset({ texture: 'resonant', key: 7 }));
    const expected = computeMusicContextChecksum(ctx.harmony.bars.map(normalizeChordSymbol));
    expect(ctx.harmony.checksum).toBe(expected);
    expect(ctx.harmony.bars).toEqual(ctx.harmony.bars.map(normalizeChordSymbol));
  });

  it("provenance.sourceEngineId === 'ecm'", () => {
    const ctx = buildMusicContextFromEcm(samplePreset({ texture: 'sparse' }));
    expect(ctx.provenance?.sourceEngineId).toBe('ecm');
    expect(typeof ctx.provenance?.capturedAt).toBe('number');
  });

  it('all voicing values produce non-empty bars', () => {
    const voicings: EcmChamberVoicing[] = ['close', 'open', 'mixed'];
    for (const voicing of voicings) {
      for (const texture of textures) {
        const ctx = buildMusicContextFromEcm(samplePreset({ texture, voicing }));
        expect(ctx.harmony.bars.length).toBeGreaterThan(0);
        expect(ctx.harmony.bars.every((b) => b.trim().length > 0)).toBe(true);
      }
    }
  });
});
