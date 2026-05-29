/**
 * Duo export-truth + MusicContext shell (V100a) + LOCK (V100b).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  computeMusicContextChecksum,
} from '../music-context/musicContextAdapters';
import { runGoldenPath } from '../goldenPath/runGoldenPath';
import { buildDuoExportTruth } from './duoExportHelper';
import { buildMusicContextFromDuo } from './duoMusicContextShell';
import {
  assertDuoLock,
  buildMusicContextFromLockedDuo,
  buildDuoMusicContextFromScore,
  isDuoLocked,
  lockDuo,
} from './duoLock';
import type { DuoExportTruth, DuoLock } from './duoTypes';

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

describe('duoLock', () => {
  it('lockDuo returns valid DuoLock with correct checksum', () => {
    const truth = buildDuoExportTruth(['Dm7', 'G7'], ['G7', 'Cmaj7']);
    const lock = lockDuo(truth);
    expect(lock.checksum).toBe(truth.checksum);
    expect(lock.upper.bars).toEqual(truth.upperBars);
    expect(lock.lower.bars).toEqual(truth.lowerBars);
    expect(typeof lock.lockedAt).toBe('number');
    expect(lock.lockedAt).toBeGreaterThan(0);
  });

  it('isDuoLocked false for null, true for valid lock', () => {
    expect(isDuoLocked(null)).toBe(false);
    const lock = lockDuo(buildDuoExportTruth(['Cmaj7'], ['G7']));
    expect(isDuoLocked(lock)).toBe(true);
  });

  it('assertDuoLock throws on null', () => {
    expect(() => assertDuoLock(null)).toThrow(/no valid duo lock/i);
  });

  it('assertDuoLock blocks if checksum missing', () => {
    const badLock = {
      upper: { bars: ['Cmaj7'] },
      lower: { bars: ['G7'] },
      lockedAt: Date.now(),
      checksum: '',
    } satisfies DuoLock;
    expect(isDuoLocked(badLock)).toBe(false);
    expect(() => assertDuoLock(badLock)).toThrow(/no valid duo lock/i);
  });

  it('lockDuo throws when export truth checksum missing', () => {
    const truth: DuoExportTruth = {
      upperBars: ['Cmaj7'],
      lowerBars: ['G7'],
      checksum: '',
      capturedAt: Date.now(),
    };
    expect(() => lockDuo(truth)).toThrow(/checksum missing/i);
  });

  it('full path: exportTruth → lock → MusicContext succeeds', () => {
    const truth = buildDuoExportTruth(['Dm7', 'G7', 'Cmaj7'], ['Dm7', 'G7', 'Cmaj7']);
    const ctx = buildMusicContextFromLockedDuo(truth);
    expect(ctx.harmony.checksum).toBe(truth.checksum);
    expect(ctx.harmony.bars).toEqual(truth.upperBars);
    expect(ctx.presetId).toBe('guitar_bass_duo');
  });

  it('golden path score → locked MusicContext', () => {
    const gp = runGoldenPath(424242);
    expect(gp.success).toBe(true);
    const ctx = buildDuoMusicContextFromScore(gp.score);
    expect(ctx.provenance?.sourceEngineId).toBe('duo');
    expect(ctx.harmony.bars.length).toBe(gp.context.form.totalBars);
    expect(ctx.harmony.checksum.length).toBeGreaterThan(0);
  });
});
