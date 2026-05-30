/**
 * Duo LOCK — export-truth fingerprint gate before MusicContext handoff (V100b).
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { MusicContext } from '../music-context/musicContextTypes';
import { buildDuoExportTruth, extractDuoBarsFromScore } from './duoExportHelper';
import { buildMusicContextFromDuo } from './duoMusicContextShell';
import type { DuoExportTruth, DuoLock } from './duoTypes';

const DUO_LOCK_MISSING = 'Duo LOCK: export truth checksum missing or empty';
const DUO_LOCK_NOT_HELD = 'Duo LOCK: generation blocked — no valid duo lock';

/** Seal export truth into a DuoLock (checksum required). */
export function lockDuo(truth: DuoExportTruth): DuoLock {
  const checksum = typeof truth.checksum === 'string' ? truth.checksum.trim() : '';
  if (!checksum) {
    throw new Error(DUO_LOCK_MISSING);
  }
  return {
    upper: { bars: [...truth.upperBars] },
    lower: { bars: [...truth.lowerBars] },
    lockedAt: Date.now(),
    checksum,
  };
}

export function isDuoLocked(lock: DuoLock | null): boolean {
  if (lock == null) return false;
  if (typeof lock.checksum !== 'string' || lock.checksum.trim().length === 0) return false;
  if (typeof lock.lockedAt !== 'number' || !Number.isFinite(lock.lockedAt) || lock.lockedAt <= 0) {
    return false;
  }
  return Array.isArray(lock.upper?.bars) && Array.isArray(lock.lower?.bars);
}

export function assertDuoLock(lock: DuoLock | null): asserts lock is DuoLock {
  if (!isDuoLocked(lock)) {
    throw new Error(DUO_LOCK_NOT_HELD);
  }
}

/** exportTruth → lock → MusicContext (always-on duo producer path). */
export function buildMusicContextFromLockedDuo(truth: DuoExportTruth): MusicContext {
  const lock = lockDuo(truth);
  assertDuoLock(lock);
  return buildMusicContextFromDuo(truth);
}

/** Score → export truth → LOCK → MusicContext. */
export function buildDuoMusicContextFromScore(score: ScoreModel): MusicContext {
  const { upper, lower } = extractDuoBarsFromScore(score);
  const truth = buildDuoExportTruth(upper, lower);
  return buildMusicContextFromLockedDuo(truth);
}
