/**
 * Duo V3.2 — Identity moment (signature bar 7): gates, distinctiveness, interval peak vs bar 6.
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import {
  computeDuoIdentityMomentScore,
  distinctiveGuitarBarIndex,
  guitarBarMaxAdjacentInterval,
  validateDuoIdentityMomentGate,
} from '../core/score-integrity/duoLockQuality';

const STRESS_SEEDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

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

function testDistinctiveBarIsSeven(): boolean {
  for (const seed of STRESS_SEEDS) {
    const r = runGoldenPath(seed);
    const g = guitarPart(r.score);
    if (!g || distinctiveGuitarBarIndex(g) !== 7) return false;
  }
  return true;
}

function testBarSevenContrastsBarSixAndEightRhythm(): boolean {
  for (const seed of STRESS_SEEDS) {
    const r = runGoldenPath(seed);
    const g = guitarPart(r.score);
    const m6 = g?.measures.find((x) => x.index === 6);
    const m7 = g?.measures.find((x) => x.index === 7);
    const m8 = g?.measures.find((x) => x.index === 8);
    if (!m6 || !m7 || !m8) return false;
    const sig = (m: typeof m7) =>
      [...m.events]
        .filter((e) => e.kind === 'note')
        .sort(
          (a, b) =>
            (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat
        )
        .map(
          (e) =>
            `${(e as { startBeat: number }).startBeat}:${(e as { duration: number }).duration}`
        )
        .join('|');
    const s6 = sig(m6);
    const s7 = sig(m7);
    const s8 = sig(m8);
    if (s7 === s6 || s7 === s8) return false;
  }
  return true;
}

function testBarSevenIntervalPeakVsBarSix(): boolean {
  for (const seed of STRESS_SEEDS) {
    const r = runGoldenPath(seed);
    const g = guitarPart(r.score);
    const m6 = g?.measures.find((x) => x.index === 6);
    const m7 = g?.measures.find((x) => x.index === 7);
    if (!m6 || !m7) return false;
    if (guitarBarMaxAdjacentInterval(m7) < guitarBarMaxAdjacentInterval(m6)) return false;
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
    ['V3.2 identity moment gate (multi-seed)', testIdentityMomentGateStress],
    ['V3.2 distinctive guitar bar is bar 7', testDistinctiveBarIsSeven],
    ['V3.2 bar 7 rhythm contrasts bars 6 and 8', testBarSevenContrastsBarSixAndEightRhythm],
    ['V3.2 bar 7 interval peak ≥ bar 6', testBarSevenIntervalPeakVsBarSix],
    ['V3.2 identity gate with Bacharach primary (sample)', testIdentityMomentBacharachPrimarySample],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
