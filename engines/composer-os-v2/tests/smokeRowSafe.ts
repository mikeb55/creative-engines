/**
 * Smoke harness — convert bounded golden-path throws into FAIL rows (no job-killing uncaught).
 */
import { DuoVaultMotifContourStarvationError } from '../core/goldenPath/duoVaultMotifContourSnap';

export function runSmokeRow(name: string, fn: () => boolean): { name: string; ok: boolean } {
  try {
    return { name, ok: fn() };
  } catch (e) {
    if (e instanceof DuoVaultMotifContourStarvationError) {
      return { name: `${name} — vault contour pool starved (${e.message})`, ok: false };
    }
    throw e;
  }
}

export function runSmokeRows(
  cases: readonly (readonly [string, () => boolean])[]
): { name: string; ok: boolean }[] {
  return cases.map(([name, fn]) => runSmokeRow(name, fn));
}

/** Suite-level safety net when a runner throws before returning rows. */
export function smokeSuiteRowsFromRun(
  suiteLabel: string,
  run: () => { name: string; ok: boolean }[]
): { name: string; ok: boolean }[] {
  try {
    return run();
  } catch (e) {
    if (e instanceof DuoVaultMotifContourStarvationError) {
      return [{ name: `${suiteLabel} — vault contour pool starved (${e.message})`, ok: false }];
    }
    throw e;
  }
}
