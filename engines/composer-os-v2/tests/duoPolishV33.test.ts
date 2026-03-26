/**
 * Duo V3.3 — Final polish: asymmetry, delayed resolution, density restraint, identity clarity.
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import {
  barHasDelayedResolutionGesture,
  computeDuoGceScore,
  computeDuoPolishV33Score,
  countDelayedResolutionBars,
  guitarPhraseOnsetSpread,
  validateDuoPolishV33Gate,
} from '../core/score-integrity/duoLockQuality';

const STRESS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

function guitar(score: ReturnType<typeof runGoldenPath>['score']) {
  return score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
}

function testPolishGateMultiSeed(): boolean {
  for (const seed of STRESS) {
    const r = runGoldenPath(seed);
    if (!r.success) return false;
    if (!validateDuoPolishV33Gate(r.score).valid) return false;
  }
  return true;
}

function testGceNinePlusMultiSeed(): boolean {
  for (const seed of STRESS) {
    const r = runGoldenPath(seed);
    if (!r.success) return false;
    if (computeDuoGceScore(r.score) < 9.0) return false;
  }
  return true;
}

function testAsymmetrySpreadOrDelayedResolution(): boolean {
  for (const seed of STRESS) {
    const r = runGoldenPath(seed);
    const g = guitar(r.score);
    if (!g) return false;
    const sp = guitarPhraseOnsetSpread(g);
    const delayed = countDelayedResolutionBars(g);
    if (sp < 0.28 && delayed === 0) return false;
  }
  return true;
}

function testDelayedResolutionBarExists(): boolean {
  const r = runGoldenPath(100);
  const g = guitar(r.score);
  if (!g) return false;
  let any = false;
  for (let bar = 1; bar <= 8; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (m && barHasDelayedResolutionGesture(m)) any = true;
  }
  return any;
}

function testDensityRestraintNoteCount(): boolean {
  const r = runGoldenPath(101);
  const g = guitar(r.score);
  if (!g) return false;
  let n = 0;
  for (const m of g.measures) {
    n += m.events.filter((e) => e.kind === 'note').length;
  }
  return n <= 48;
}

function testPolishScoreFloor(): boolean {
  const r = runGoldenPath(102);
  return computeDuoPolishV33Score(r.score) >= 7.2;
}

function testIdentityBarSevenRestOrClarity(): boolean {
  const r = runGoldenPath(103);
  const g = guitar(r.score);
  const m7 = g?.measures.find((x) => x.index === 7);
  if (!m7) return false;
  let restBeats = 0;
  for (const e of m7.events) {
    if (e.kind === 'rest') restBeats += (e as { duration: number }).duration;
  }
  const notes = m7.events.filter((e) => e.kind === 'note').length;
  return restBeats >= 0.35 || notes <= 4;
}

export function runDuoPolishV33Tests(): { name: string; ok: boolean }[] {
  return [
    ['V3.3 polish gate (multi-seed)', testPolishGateMultiSeed],
    ['V3.3 duo GCE ≥ 9.0 (multi-seed)', testGceNinePlusMultiSeed],
    ['V3.3 asymmetry or delayed resolution (multi-seed)', testAsymmetrySpreadOrDelayedResolution],
    ['V3.3 at least one delayed-resolution bar (seed 100)', testDelayedResolutionBarExists],
    ['V3.3 guitar note count ≤ 48 (seed 101)', testDensityRestraintNoteCount],
    ['V3.3 polish score ≥ 7.2 (seed 102)', testPolishScoreFloor],
    ['V3.3 identity bar 7 space (seed 103)', testIdentityBarSevenRestOrClarity],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
