/**
 * Duo LOCK quality — GCE gate, rest density, rhythm anti-loop, motivic intervals.
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import {
  computeDuoGceScore,
  guitarRestRatio,
  hasRepeatedIntervalCell,
  validateDuoGceHardGate,
  validateDuoRhythmAntiLoop,
} from '../core/score-integrity/duoLockQuality';

function testDuoLockGcePassesGoldenPath(): boolean {
  const r = runGoldenPath(100);
  return (
    r.success &&
    validateDuoGceHardGate(r.score).valid &&
    computeDuoGceScore(r.score) >= 8.5
  );
}

function testGuitarRestDensityInRange(): boolean {
  const r = runGoldenPath(101);
  const g = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return false;
  const rr = guitarRestRatio(g);
  return rr >= 0.06 && rr <= 0.5;
}

function testRhythmAntiLoopPasses(): boolean {
  const r = runGoldenPath(102);
  return validateDuoRhythmAntiLoop(r.score).valid;
}

function testRepeatedIntervalCellPresent(): boolean {
  const r = runGoldenPath(103);
  const g = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  return g ? hasRepeatedIntervalCell(g) : false;
}

function testDuoLockPlacementsDense(): boolean {
  const r = runGoldenPath(104);
  const n = r.plans?.motifState?.placements?.length ?? 0;
  return n >= 6;
}

export function runDuoLockQualityTests(): { name: string; ok: boolean }[] {
  return [
    ['Duo LOCK GCE ≥ 8.5 on golden path', testDuoLockGcePassesGoldenPath],
    ['Guitar rest density in practical range', testGuitarRestDensityInRange],
    ['Duo rhythm anti-loop passes', testRhythmAntiLoopPasses],
    ['Repeated interval cell in guitar line', testRepeatedIntervalCellPresent],
    ['Duo LOCK motif placements (8-bar coverage)', testDuoLockPlacementsDense],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
