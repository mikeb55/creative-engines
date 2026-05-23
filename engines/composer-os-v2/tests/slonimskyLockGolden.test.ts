/**
 * Slonimsky manual-verify lock goldens (tests 1, 2, 6, 7) — seed 42.
 * Not on the smoke allowlist; run via `npx tsx engines/composer-os-v2/scripts/verifySlonimskyLockGolden.ts`.
 */

import * as fs from 'fs';
import {
  SLONIMSKY_LOCK_GOLDEN_DIR,
  compareToGolden,
  evaluateLockCriteria,
  goldenPath,
  loadSlonimskyLockGolden,
  runTest1,
  runTest2,
  runTest6,
  runTest7,
  type SlonimskyLockGoldenId,
} from './slonimskyLockGolden';

const LOCK_IDS: SlonimskyLockGoldenId[] = ['test1', 'test2', 'test6', 'test7'];

export function runSlonimskyLockGoldenTests(): { name: string; ok: boolean }[] {
  return LOCK_IDS.map((id) => {
    const runners = { test1: runTest1, test2: runTest2, test6: runTest6, test7: runTest7 } as const;
    const { fixture, error } = runners[id]();
    const lockFails = evaluateLockCriteria(id, fixture);
    const lockOk = lockFails.length === 0 && !error;
    let goldenOk = true;
    if (fs.existsSync(goldenPath(id))) {
      goldenOk = compareToGolden(fixture, loadSlonimskyLockGolden(id)).length === 0;
    }
    const ok = lockOk && goldenOk;
    const bits = [
      error ? `gen:${error}` : null,
      lockFails.length ? `lock:${lockFails.join(';')}` : null,
      !goldenOk ? 'golden:drift' : null,
    ].filter(Boolean);
    return {
      name: `slonimsky-lock — ${id} seed 42${bits.length ? ` (${bits.join(' | ')})` : ''}`,
      ok,
    };
  });
}
