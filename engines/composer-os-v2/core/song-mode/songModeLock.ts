/**
 * Song Mode LOCK — export-truth fingerprint gate before MusicContext handoff (V103a).
 */

import type { MusicContext } from '../music-context/musicContextTypes';
import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  buildMusicContextFromSongModeTruth,
  buildSongModeSectionContext,
  computeSongModeMasterChecksum,
} from './songModeProducer';
import type { SongModeExportTruth, SongModeLock, SongModeResult } from './songModeTypes';

const SONG_MODE_LOCK_MISSING = 'Song Mode LOCK: export truth checksum missing or empty';
const SONG_MODE_LOCK_NOT_HELD = 'Duo LOCK: generation blocked — no valid duo lock';

/** Seal export truth into a SongModeLock (masterChecksum required). */
export function lockSongMode(truth: SongModeExportTruth | SongModeResult): SongModeLock {
  const checksum =
    typeof truth.masterChecksum === 'string' ? truth.masterChecksum.trim() : '';
  if (!checksum) {
    throw new Error(SONG_MODE_LOCK_MISSING);
  }
  return {
    sections: truth.sectionsOrdered.map((s) => ({
      sectionId: s.sectionId,
      plan: { ...s.plan },
      checksum: s.checksum,
      harmonyBars: [...s.musicContext.harmony.bars],
    })),
    lockedAt: Date.now(),
    checksum,
  };
}

export function isSongModeLocked(lock: SongModeLock | null): boolean {
  if (lock == null) return false;
  if (typeof lock.checksum !== 'string' || lock.checksum.trim().length === 0) return false;
  if (typeof lock.lockedAt !== 'number' || !Number.isFinite(lock.lockedAt) || lock.lockedAt <= 0) {
    return false;
  }
  return (
    Array.isArray(lock.sections) &&
    lock.sections.every(
      (s) =>
        typeof s.sectionId === 'string' &&
        s.sectionId.length > 0 &&
        Array.isArray(s.harmonyBars) &&
        typeof s.checksum === 'string' &&
        s.checksum.length > 0
    )
  );
}

export function assertSongModeLock(lock: SongModeLock | null): asserts lock is SongModeLock {
  if (!isSongModeLocked(lock)) {
    throw new Error(SONG_MODE_LOCK_NOT_HELD);
  }
}

/** Recompute masterChecksum from locked section snapshots + order data. */
export function recomputeMasterChecksumFromLock(lock: SongModeLock): string {
  return computeSongModeMasterChecksum(lock.sections);
}

/** Post-lock drift check — recomputed fingerprint must match sealed checksum. */
export function assertSongModeLockIntegrity(lock: SongModeLock): void {
  assertSongModeLock(lock);
  const recomputed = recomputeMasterChecksumFromLock(lock);
  if (recomputed !== lock.checksum) {
    throw new Error('Song Mode LOCK: masterChecksum drift detected');
  }
}

/** exportTruth → lock → assertSongModeLock → MusicContext. */
export function buildMusicContextFromLockedSongMode(truth: SongModeExportTruth): MusicContext {
  const lock = lockSongMode(truth);
  assertSongModeLock(lock);
  assertSongModeLockIntegrity(lock);
  return buildMusicContextFromSongModeTruth(truth);
}

function exportTruthFromLock(lock: SongModeLock): SongModeExportTruth {
  const sectionsOrdered = lock.sections.map((s) => {
    const bars = s.harmonyBars.map(normalizeChordSymbol);
    const section = buildSongModeSectionContext({
      sectionId: s.sectionId,
      plan: s.plan,
      harmonyBars: bars,
    });
    return { ...section, checksum: s.checksum };
  });
  const sectionById = Object.fromEntries(
    sectionsOrdered.map((section) => [section.sectionId, section])
  ) as Record<string, (typeof sectionsOrdered)[number]>;
  return {
    sectionsOrdered,
    sectionById,
    masterChecksum: lock.checksum,
    capturedAt: lock.lockedAt,
  };
}

/** Locked sections → final MusicContext (re-normalise + checksum-after-norm). */
export function projectSongModeLock(
  lock: SongModeLock,
  seed: number,
  bpm?: number
): MusicContext {
  assertSongModeLockIntegrity(lock);
  return buildMusicContextFromSongModeTruth(exportTruthFromLock(lock), {
    seed,
    ...(typeof bpm === 'number' && Number.isFinite(bpm) ? { bpm } : {}),
  });
}
