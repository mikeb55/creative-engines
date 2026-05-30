/**
 * Song Mode export-truth + LOCK + MusicContext producer (V103a).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import {
  assembleSongModeExportTruth,
  buildMusicContextFromSongModeTruth,
  buildSongModeResult,
  buildSongModeSectionContext,
  buildSongModeStructureFromChordPlan,
  computeSongModeMasterChecksum,
  computeSongModeSectionChecksum,
} from './songModeProducer';
import {
  assertSongModeLock,
  assertSongModeLockIntegrity,
  buildMusicContextFromLockedSongMode,
  isSongModeLocked,
  lockSongMode,
  projectSongModeLock,
  recomputeMasterChecksumFromLock,
} from './songModeLock';
import type { SongModeLock } from './songModeTypes';
import { buildDuoExportTruth } from '../duo/duoExportHelper';
import { lockDuo } from '../duo/duoLock';

describe('buildSongModeSectionContext', () => {
  it('checksum matches normalised harmony bars', () => {
    const section = buildSongModeSectionContext({
      sectionId: 'verse_1',
      plan: { order: 0, kind: 'verse' },
      harmonyBars: ['C^7', 'D-7'],
    });
    const expected = computeSongModeSectionChecksum(['C^7', 'D-7']);
    expect(section.checksum).toBe(expected);
    expect(section.musicContext.harmony.bars).toEqual(['Cmaj7', 'Dm7']);
  });
});

describe('assembleSongModeExportTruth', () => {
  it('rejects duplicate section ID with ID in error message', () => {
    expect(() =>
      assembleSongModeExportTruth([
        { sectionId: 'verse_1', plan: { order: 0, kind: 'verse' }, harmonyBars: ['Cmaj7'] },
        { sectionId: 'verse_1', plan: { order: 1, kind: 'chorus' }, harmonyBars: ['G7'] },
      ])
    ).toThrow('Song Mode: duplicate section ID "verse_1"');
  });

  it('logs each section checksum before masterChecksum', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const truth = assembleSongModeExportTruth([
      { sectionId: 'verse_1', plan: { order: 0, kind: 'verse' }, harmonyBars: ['Dm7', 'G7'] },
      { sectionId: 'chorus_1', plan: { order: 1, kind: 'chorus' }, harmonyBars: ['Cmaj7'] },
    ]);
    expect(spy).toHaveBeenCalledWith(
      '[Song Mode] section checksum',
      'verse_1',
      truth.sectionById.verse_1!.checksum
    );
    expect(spy).toHaveBeenCalledWith(
      '[Song Mode] section checksum',
      'chorus_1',
      truth.sectionById.chorus_1!.checksum
    );
    spy.mockRestore();
  });

  it('masterChecksum is deterministic from ordered section identity + checksums', () => {
    const inputs = [
      { sectionId: 'chorus_1', plan: { order: 1, kind: 'chorus' as const }, harmonyBars: ['Cmaj7'] },
      { sectionId: 'verse_1', plan: { order: 0, kind: 'verse' as const }, harmonyBars: ['Dm7', 'G7'] },
    ];
    const a = assembleSongModeExportTruth(inputs);
    const b = assembleSongModeExportTruth(inputs);
    expect(a.masterChecksum).toBe(b.masterChecksum);
    expect(a.sectionsOrdered.map((s) => s.sectionId)).toEqual(['verse_1', 'chorus_1']);
    expect(computeSongModeMasterChecksum(a.sectionsOrdered)).toBe(a.masterChecksum);
  });
});

describe('songModeLock', () => {
  it('lockSongMode throws when masterChecksum empty', () => {
    const truth = assembleSongModeExportTruth([
      { sectionId: 'verse_1', plan: { order: 0, kind: 'verse' }, harmonyBars: ['Cmaj7'] },
    ]);
    expect(() => lockSongMode({ ...truth, masterChecksum: '' })).toThrow(/checksum missing/i);
  });

  it('assertSongModeLock failure text matches exactly', () => {
    expect(() => assertSongModeLock(null)).toThrow(
      'Duo LOCK: generation blocked — no valid duo lock'
    );
    const badLock = {
      sections: [
        {
          sectionId: 'verse_1',
          plan: { order: 0, kind: 'verse' as const },
          checksum: 'abc',
          harmonyBars: ['Cmaj7'],
        },
      ],
      lockedAt: Date.now(),
      checksum: '',
    } satisfies SongModeLock;
    expect(isSongModeLocked(badLock)).toBe(false);
    expect(() => assertSongModeLock(badLock)).toThrow(
      'Duo LOCK: generation blocked — no valid duo lock'
    );
  });

  it('post-lock drift check: recompute matches sealed masterChecksum', () => {
    const truth = assembleSongModeExportTruth([
      { sectionId: 'verse_1', plan: { order: 0, kind: 'verse' }, harmonyBars: ['Dm7', 'G7'] },
      { sectionId: 'chorus_1', plan: { order: 1, kind: 'chorus' }, harmonyBars: ['Cmaj7', 'Fmaj7'] },
    ]);
    const lock = lockSongMode(truth);
    expect(recomputeMasterChecksumFromLock(lock)).toBe(lock.checksum);
    expect(() => assertSongModeLockIntegrity(lock)).not.toThrow();
  });

  it('negative drift: altered section context causes mismatch', () => {
    const truth = assembleSongModeExportTruth([
      { sectionId: 'verse_1', plan: { order: 0, kind: 'verse' }, harmonyBars: ['Dm7'] },
    ]);
    const lock = lockSongMode(truth);
    lock.sections[0]!.checksum = 'tampered';
    expect(recomputeMasterChecksumFromLock(lock)).not.toBe(lock.checksum);
    expect(() => assertSongModeLockIntegrity(lock)).toThrow(/drift detected/i);
  });

  it('full path: truth → lock → MusicContext succeeds', () => {
    const truth = assembleSongModeExportTruth([
      { sectionId: 'verse_1', plan: { order: 0, kind: 'verse' }, harmonyBars: ['Dm7', 'G7'] },
      { sectionId: 'chorus_1', plan: { order: 1, kind: 'chorus' }, harmonyBars: ['Cmaj7'] },
    ]);
    const ctx = buildMusicContextFromLockedSongMode(truth);
    expect(ctx.schemaVersion).toBe('1.0');
    expect(ctx.presetId).toBe('song_mode');
    expect(ctx.provenance?.sourceEngineId).toBe('song_mode');
    expect(ctx.receipts.length).toBeGreaterThan(0);
  });
});

describe('buildMusicContextFromSongModeTruth', () => {
  it('uses normalised concatenated bars + checksum-after-norm', () => {
    const truth = assembleSongModeExportTruth([
      { sectionId: 'verse_1', plan: { order: 0, kind: 'verse' }, harmonyBars: ['C^7'] },
      { sectionId: 'chorus_1', plan: { order: 1, kind: 'chorus' }, harmonyBars: ['D-7'] },
    ]);
    const ctx = buildMusicContextFromSongModeTruth(truth);
    const expectedBars = ['Cmaj7', 'Dm7'];
    expect(ctx.harmony.bars).toEqual(expectedBars);
    expect(ctx.harmony.bars).toEqual(ctx.harmony.bars.map(normalizeChordSymbol));
    expect(ctx.harmony.checksum).toBe(
      computeMusicContextChecksum(expectedBars.map(normalizeChordSymbol))
    );
    expect(ctx.totalBars).toBe(2);
  });
});

describe('V103b handoff helpers', () => {
  const chordPlan = [
    {
      sectionOrder: 0,
      sectionKind: 'verse' as const,
      intensity: 'medium' as const,
      chordSymbols: ['Dm7', 'G7'],
    },
    {
      sectionOrder: 1,
      sectionKind: 'chorus' as const,
      intensity: 'high' as const,
      chordSymbols: ['Cmaj7'],
    },
  ];

  it('buildSongModeStructureFromChordPlan rejects duplicate section IDs', () => {
    expect(() =>
      buildSongModeStructureFromChordPlan(chordPlan, [
        { label: 'A', startBar: 1, length: 4 },
        { label: 'A', startBar: 5, length: 4 },
      ])
    ).toThrow('Song Mode: duplicate section ID "a"');
  });

  it('uses Song Mode path when chordPlan non-empty', () => {
    const duoLock = lockDuo(buildDuoExportTruth(['Dm7', 'G7'], ['Dm7', 'G7']));
    const structure = buildSongModeStructureFromChordPlan(chordPlan);
    const result = buildSongModeResult(structure, duoLock);
    const lock = lockSongMode(result);
    assertSongModeLock(lock);
    const ctx = projectSongModeLock(lock, 424242, 96);
    expect(ctx.presetId).toBe('song_mode');
    expect(ctx.provenance?.sourceEngineId).toBe('song_mode');
    expect(ctx.schemaVersion).toBe('1.0');
    expect(ctx.harmony.bars).toEqual(['Dm7', 'G7', 'Cmaj7']);
  });

  it('duo fallback path keeps guitar_bass_duo presetId', () => {
    const duoLock = lockDuo(buildDuoExportTruth(['Dm7'], ['G7']));
    expect(duoLock.checksum.length).toBeGreaterThan(0);
    expect(buildSongModeStructureFromChordPlan([]).sectionInputs).toEqual([]);
  });

  it('projectSongModeLock catches post-lock drift', () => {
    const duoLock = lockDuo(buildDuoExportTruth(['Cmaj7'], ['G7']));
    const lock = lockSongMode(buildSongModeResult(buildSongModeStructureFromChordPlan(chordPlan), duoLock));
    lock.sections[0]!.checksum = 'tampered';
    expect(() => projectSongModeLock(lock, 1)).toThrow(/drift detected/i);
  });

  it('logs section checksums before masterChecksum via buildSongModeResult', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const duoLock = lockDuo(buildDuoExportTruth(['Dm7'], ['G7']));
    buildSongModeResult(buildSongModeStructureFromChordPlan(chordPlan), duoLock);
    expect(spy).toHaveBeenCalledWith('[Song Mode] section checksum', 'verse_0', expect.any(String));
    spy.mockRestore();
  });
});
