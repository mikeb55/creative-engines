/**
 * New Orleans MusicContext producer (V104p6).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import {
  NEW_ORLEANS_COMPING_STYLES,
  type NewOrleansCompingStyle,
  type NewOrleansMusicContextPreset,
} from './newOrleansMusicContextTypes';
import { buildMusicContextFromNewOrleans } from './newOrleansMusicContextProducer';

function samplePreset(
  overrides: Partial<NewOrleansMusicContextPreset> & Pick<NewOrleansMusicContextPreset, 'compingStyle'>,
): NewOrleansMusicContextPreset {
  return {
    key: 0,
    tempo: 0,
    ...overrides,
  };
}

describe('buildMusicContextFromNewOrleans', () => {
  it.each(NEW_ORLEANS_COMPING_STYLES)(
    'returns valid MusicContext for comping style %s',
    (compingStyle) => {
      const ctx = buildMusicContextFromNewOrleans(samplePreset({ compingStyle }));
      expect(ctx.schemaVersion).toBe('1.0');
      expect(ctx.presetId).toBe('new_orleans');
      expect(ctx.harmony.bars.length).toBe(8);
      expect(ctx.totalBars).toBe(8);
      expect(ctx.harmony.bars.every((b) => b.trim().length > 0)).toBe(true);
    },
  );

  it('harmony.checksum matches normalised bars', () => {
    const ctx = buildMusicContextFromNewOrleans(samplePreset({ compingStyle: 'second_line', key: 7 }));
    const expected = computeMusicContextChecksum(ctx.harmony.bars.map(normalizeChordSymbol));
    expect(ctx.harmony.checksum).toBe(expected);
    expect(ctx.harmony.bars).toEqual(ctx.harmony.bars.map(normalizeChordSymbol));
  });

  it("provenance.sourceEngineId === 'new_orleans'", () => {
    const ctx = buildMusicContextFromNewOrleans(samplePreset({ compingStyle: 'anticipation_bass' }));
    expect(ctx.provenance?.sourceEngineId).toBe('new_orleans');
    expect(typeof ctx.provenance?.capturedAt).toBe('number');
  });

  it('receipt kind new_orleans_realisation_complete carries compingStyle', () => {
    const styles: NewOrleansCompingStyle[] = ['second_line', 'brass_punch_offbeat'];
    for (const compingStyle of styles) {
      const ctx = buildMusicContextFromNewOrleans(samplePreset({ compingStyle, tempo: 115 }));
      const receipt = ctx.receipts.find((r) => r.kind === 'new_orleans_realisation_complete');
      expect(receipt?.engine).toBe('new_orleans');
      expect(receipt?.payload).toMatchObject({
        compingStyle,
        barCount: 8,
        bpm: 115,
      });
    }
  });

  it('uses style default tempo when preset tempo is zero', () => {
    const ctx = buildMusicContextFromNewOrleans(samplePreset({ compingStyle: 'second_line', tempo: 0 }));
    expect(ctx.bpm).toBe(120);
  });
});
