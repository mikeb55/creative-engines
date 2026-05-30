/**
 * Big Band MusicContext producer (V104p6).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import {
  BIG_BAND_COMPING_STYLES,
  type BigBandCompingStyle,
  type BigBandMusicContextPreset,
} from './bigBandMusicContextTypes';
import { buildMusicContextFromBigBand } from './bigBandMusicContextProducer';

function samplePreset(
  overrides: Partial<BigBandMusicContextPreset> & Pick<BigBandMusicContextPreset, 'compingStyle'>,
): BigBandMusicContextPreset {
  return {
    key: 10,
    tempo: 0,
    ...overrides,
  };
}

describe('buildMusicContextFromBigBand', () => {
  it.each(BIG_BAND_COMPING_STYLES)('returns valid MusicContext for comping style %s', (compingStyle) => {
    const ctx = buildMusicContextFromBigBand(samplePreset({ compingStyle }));
    expect(ctx.schemaVersion).toBe('1.0');
    expect(ctx.presetId).toBe('big_band');
    expect(ctx.harmony.bars.length).toBe(8);
    expect(ctx.totalBars).toBe(8);
    expect(ctx.harmony.bars.every((b) => b.trim().length > 0)).toBe(true);
  });

  it('harmony.checksum matches normalised bars', () => {
    const ctx = buildMusicContextFromBigBand(samplePreset({ compingStyle: 'sax_soli', key: 0 }));
    const expected = computeMusicContextChecksum(ctx.harmony.bars.map(normalizeChordSymbol));
    expect(ctx.harmony.checksum).toBe(expected);
    expect(ctx.harmony.bars).toEqual(ctx.harmony.bars.map(normalizeChordSymbol));
  });

  it("provenance.sourceEngineId === 'big_band'", () => {
    const ctx = buildMusicContextFromBigBand(samplePreset({ compingStyle: 'freddie_green' }));
    expect(ctx.provenance?.sourceEngineId).toBe('big_band');
    expect(typeof ctx.provenance?.capturedAt).toBe('number');
  });

  it('receipt kind big_band_realisation_complete carries compingStyle', () => {
    const styles: BigBandCompingStyle[] = ['brass_punch', 'shell_voicing'];
    for (const compingStyle of styles) {
      const ctx = buildMusicContextFromBigBand(samplePreset({ compingStyle, tempo: 140 }));
      const receipt = ctx.receipts.find((r) => r.kind === 'big_band_realisation_complete');
      expect(receipt?.engine).toBe('big_band');
      expect(receipt?.payload).toMatchObject({
        compingStyle,
        barCount: 8,
        bpm: 140,
      });
    }
  });

  it('uses style default tempo when preset tempo is zero', () => {
    const ctx = buildMusicContextFromBigBand(samplePreset({ compingStyle: 'freddie_green', tempo: 0 }));
    expect(ctx.bpm).toBe(72);
  });
});
