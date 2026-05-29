/**
 * Duo export-truth + MusicContext shell (V100a).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  computeMusicContextChecksum,
} from '../music-context/musicContextAdapters';
import { buildDuoExportTruth } from './duoExportHelper';
import { buildMusicContextFromDuo } from './duoMusicContextShell';

describe('buildDuoExportTruth', () => {
  it('normalises both voices', () => {
    const truth = buildDuoExportTruth(['C^7', 'D-7'], ['G7', 'C^7']);
    expect(truth.upperBars).toEqual(['Cmaj7', 'Dm7']);
    expect(truth.lowerBars).toEqual(['G7', 'Cmaj7']);
  });

  it('checksum matches normalised bars across both voices', () => {
    const upper = ['C^7', 'D-7'].map(normalizeChordSymbol);
    const lower = ['G7', 'Cmaj7'];
    const truth = buildDuoExportTruth(['C^7', 'D-7'], ['G7', 'C^7']);
    const expected = computeMusicContextChecksum([...upper, ...lower]);
    expect(truth.checksum).toBe(expected);
  });

  it('same input → same checksum (deterministic)', () => {
    const upper = ['Dm7', 'G7', 'Cmaj7'];
    const lower = ['Dm7', 'G7', 'Cmaj7'];
    const a = buildDuoExportTruth(upper, lower);
    const b = buildDuoExportTruth(upper, lower);
    expect(a.checksum).toBe(b.checksum);
    expect(a.upperBars).toEqual(b.upperBars);
    expect(a.lowerBars).toEqual(b.lowerBars);
  });
});

describe('buildMusicContextFromDuo', () => {
  it('returns valid MusicContext', () => {
    const truth = buildDuoExportTruth(['Dm7', 'G7'], ['Dm7', 'G7']);
    const ctx = buildMusicContextFromDuo(truth);
    expect(ctx.schemaVersion).toBe('1.0');
    expect(ctx.presetId).toBe('guitar_bass_duo');
    expect(ctx.harmony.bars).toEqual(truth.upperBars.map(normalizeChordSymbol));
    expect(ctx.harmony.checksum).toBe(truth.checksum);
    expect(ctx.totalBars).toBe(truth.upperBars.length);
    expect(ctx.receipts).toEqual([]);
    expect(typeof ctx.provenance?.capturedAt).toBe('number');
  });

  it("provenance.sourceEngineId === 'duo'", () => {
    const ctx = buildMusicContextFromDuo(buildDuoExportTruth(['Am7'], ['Am7']));
    expect(ctx.provenance?.sourceEngineId).toBe('duo');
  });
});
