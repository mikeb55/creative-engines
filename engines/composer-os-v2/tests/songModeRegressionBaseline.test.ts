/**
 * Deterministic Song Mode / Guitar–Bass Duo baseline — regression lock (seeds 50021, 50213).
 * Primary gate: MotifShape similarity; secondary: core contour prefix (first 5 direction steps).
 */

import assert from 'assert';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import type { GoldenPathResult } from '../core/goldenPath/runGoldenPath';
import { validateScoreModel } from '../core/score-model/scoreModelValidation';
import {
  extractMotifShapeFromGuitarBarContext,
  similarityMotifShapePitchStructure,
} from '../core/motif/motifShape';
import { guitarRestRatio } from '../core/score-integrity/duoLockQuality';
import {
  SONG_MODE_GUITAR_REST_RATIO_CEILING,
  SONG_MODE_REGRESSION_FAIL_MSG,
} from '../core/score-integrity/protectedHookBarInvariant';
import {
  contourDirSignatureFromPitches,
  hookContourCoreMatches,
  isGenericScaleRun,
  SONG_MODE_HOOK_RETURN_SIMILARITY_MIN,
  validateSongModeHookIdentity,
} from '../core/goldenPath/songModeHookIdentity';

const HOOK_BASELINE_SEEDS = [50021, 50213] as const;

function guitarPitchesTimeOrder(score: import('../core/score-model/scoreModelTypes').ScoreModel, bar: number): number[] {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const m = g?.measures.find((x) => x.index === bar);
  if (!m) return [];
  return m.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { pitch: number; startBeat: number })
    .sort((a, b) => a.startBeat - b.startBeat)
    .map((n) => n.pitch);
}

function assertHookBaselineSeed(seed: number): GoldenPathResult {
  const r = runGoldenPath(seed, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
  });
  const fail = `${SONG_MODE_REGRESSION_FAIL_MSG} (seed ${seed})`;

  assert.strictEqual(r.success, true, fail);
  const modelVal = validateScoreModel(r.score);
  assert.strictEqual(modelVal.valid, true, fail);
  assert.strictEqual(modelVal.errors.length, 0, fail);

  const g = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  assert.ok(g, fail);
  const stmt = extractMotifShapeFromGuitarBarContext(g!, 1, r.context);
  const ret = extractMotifShapeFromGuitarBarContext(g!, 25, r.context);
  assert.ok(stmt && ret, fail);
  const sim = similarityMotifShapePitchStructure(stmt!, ret!);
  assert.ok(sim >= SONG_MODE_HOOK_RETURN_SIMILARITY_MIN - 1e-9, `${fail} sim=${sim.toFixed(3)}`);

  const rr = guitarRestRatio(g!);
  assert.ok(rr <= SONG_MODE_GUITAR_REST_RATIO_CEILING + 1e-9, fail);

  const p1 = guitarPitchesTimeOrder(r.score, 1);
  const p25 = guitarPitchesTimeOrder(r.score, 25);
  assert.ok(p1.length >= 2, `${fail}: bar 1 should state a hook motif`);
  assert.ok(p25.length >= 2, `${fail}: bar 25 should reuse hook`);
  assert.ok(
    hookContourCoreMatches(contourDirSignatureFromPitches(p1), contourDirSignatureFromPitches(p25)),
    `${fail}: core contour identity`
  );

  const errs = validateSongModeHookIdentity(g!, r.context);
  assert.strictEqual(errs.length, 0, errs.join('; '));

  return r;
}

export function runSongModeRegressionBaselineTests(): GoldenPathResult {
  assert.strictEqual(isGenericScaleRun([60, 60, 60]), false);
  assert.strictEqual(isGenericScaleRun([60, 62, 64]), true);

  let last: GoldenPathResult | undefined;
  for (const seed of HOOK_BASELINE_SEEDS) {
    last = assertHookBaselineSeed(seed);
  }
  return last!;
}
