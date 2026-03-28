/**
 * Song Mode hook-first guitar identity — contour reuse, variation, validation.
 */

import assert from 'assert';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import {
  contourDirSignatureFromPitches,
  isGenericScaleRun,
  validateSongModeHookIdentity,
} from '../core/goldenPath/songModeHookIdentity';

/** Notes in chronological order for contour. */
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

export function runSongModeHookIdentityTests(): void {
  assert.strictEqual(isGenericScaleRun([60, 60, 60]), false);
  assert.strictEqual(isGenericScaleRun([60, 62, 64]), true);

  const r = runGoldenPath(4242, {
    songModeHookFirstIdentity: true,
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
  });
  assert.strictEqual(r.success, true, `expected success, errors=${r.errors?.join('; ')}`);

  const g = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  assert.ok(g);
  const p1 = guitarPitchesTimeOrder(r.score, 1);
  const p25 = guitarPitchesTimeOrder(r.score, 25);
  assert.ok(p1.length >= 2, 'bar 1 should state a hook motif');
  assert.ok(p25.length >= 2, 'bar 25 should reuse hook');
  assert.strictEqual(contourDirSignatureFromPitches(p1), contourDirSignatureFromPitches(p25), 'contour identity');

  const errs = validateSongModeHookIdentity(g!, r.context);
  assert.strictEqual(errs.length, 0, errs.join('; '));

  const rNo = runGoldenPath(4242, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    longFormEnabled: true,
  });
  assert.strictEqual(rNo.success, true);
  assert(rNo.context.generationMetadata?.songModeHookFirstIdentity !== true);
}
