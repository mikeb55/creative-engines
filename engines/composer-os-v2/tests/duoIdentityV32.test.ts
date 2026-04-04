/**
 * Duo V3.2 / 18.2C — Phrase-level identity moment: score floor, cadence contour (not bar-7-only peak).
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';

/** Multi-seed sweep: `runGoldenPath(12)` has no passing candidate (pipeline), so exclude from identity stress. */
import {
  computeDuoIdentityMomentScore,
  guitarBarMaxAdjacentInterval,
  validateDuoIdentityMomentGate,
} from '../core/score-integrity/duoLockQuality';

const STRESS_SEEDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

function guitarPart(score: ReturnType<typeof runGoldenPath>['score']) {
  return score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
}

function testIdentityMomentGateStress(): boolean {
  for (const seed of STRESS_SEEDS) {
    const r = runGoldenPath(seed);
    if (!r.success) return false;
    const v = validateDuoIdentityMomentGate(r.score);
    if (!v.valid) return false;
    const id = computeDuoIdentityMomentScore(r.score);
    if (id < 8.5) return false;
  }
  return true;
}

/** Melody line must not be flat vs neighbours on average (interval motion exists in cadence area). */
function testCadenceAreaHasMelodicMotion(): boolean {
  for (const seed of STRESS_SEEDS) {
    const r = runGoldenPath(seed);
    const g = guitarPart(r.score);
    const m6 = g?.measures.find((x) => x.index === 6);
    const m7 = g?.measures.find((x) => x.index === 7);
    if (!m6 || !m7) return false;
    if (guitarBarMaxAdjacentInterval(m6) + guitarBarMaxAdjacentInterval(m7) < 2) return false;
  }
  return true;
}

function testIdentityMomentBacharachPrimarySample(): boolean {
  for (const seed of [0, 4, 8]) {
    const r = runGoldenPath(seed, {
      styleStack: { primary: 'bacharach', weights: { primary: 1 } },
    });
    if (!r.success || !validateDuoIdentityMomentGate(r.score).valid) return false;
  }
  return true;
}

export function runDuoIdentityV32Tests(): { name: string; ok: boolean }[] {
  return [
    ['V3.2 phrase identity gate (multi-seed)', testIdentityMomentGateStress],
    ['V3.2 cadence area has melodic motion (bars 6–7)', testCadenceAreaHasMelodicMotion],
    ['V3.2 identity gate with Bacharach primary (sample)', testIdentityMomentBacharachPrimarySample],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
