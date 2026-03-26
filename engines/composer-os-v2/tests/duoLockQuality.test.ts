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
  validateDuoSwingRhythm,
} from '../core/score-integrity/duoLockQuality';
import {
  maxDuplicateBarFingerprints,
  phrasePrimaryMotifCoverage,
  validateDuoMelodyIdentityV3,
  melodyAuthorityGceLayer,
} from '../core/score-integrity/duoMelodyIdentityV3';

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

function testDuoSwingRhythmGatePasses(): boolean {
  const r = runGoldenPath(108);
  return r.success && validateDuoSwingRhythm(r.score).valid;
}

function testDuoPhraseMotifCoverage(): boolean {
  const r = runGoldenPath(109);
  const ms = r.plans?.motifState;
  if (!ms) return false;
  return phrasePrimaryMotifCoverage(ms) >= 0.75;
}

function testDuoMelodyRepetitionFingerprint(): boolean {
  const r = runGoldenPath(110);
  const g = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const originals = r.plans?.motifState?.placements.filter((p) => p.variant === 'original').length ?? 0;
  if (!g) return false;
  return maxDuplicateBarFingerprints(g) >= 2 || originals >= 2;
}

function testDuoMelodyIdentityV3Passes(): boolean {
  const r = runGoldenPath(111);
  if (!r.success || !r.plans?.motifState) return false;
  return validateDuoMelodyIdentityV3(r.score, r.plans.motifState, { presetId: 'guitar_bass_duo' }).valid;
}

function testMelodyAuthorityGceLayerPositive(): boolean {
  const r = runGoldenPath(113);
  const g = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!g) return false;
  return melodyAuthorityGceLayer(g) >= 0.35;
}

export function runDuoLockQualityTests(): { name: string; ok: boolean }[] {
  return [
    ['Duo LOCK GCE ≥ 8.5 on golden path', testDuoLockGcePassesGoldenPath],
    ['Guitar rest density in practical range', testGuitarRestDensityInRange],
    ['Duo rhythm anti-loop passes', testRhythmAntiLoopPasses],
    ['Repeated interval cell in guitar line', testRepeatedIntervalCellPresent],
    ['Duo LOCK motif placements (8-bar coverage)', testDuoLockPlacementsDense],
    ['Duo swing rhythm gate passes', testDuoSwingRhythmGatePasses],
    ['Duo phrase primary motif coverage ≥75%', testDuoPhraseMotifCoverage],
    ['Duo melody exact-repeat fingerprint', testDuoMelodyRepetitionFingerprint],
    ['Duo melody identity V3 passes', testDuoMelodyIdentityV3Passes],
    ['Duo melody authority GCE layer', testMelodyAuthorityGceLayerPositive],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
