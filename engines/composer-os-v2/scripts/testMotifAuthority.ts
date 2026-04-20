import assert from 'node:assert/strict';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';

const SEED = 50021;

function testMotifAuthorityOn(): void {
  const result = runGoldenPath(SEED, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    bpm: 100,
    longFormEnabled: true,
    motifAuthorityV1: true,
  });
  const md = result.context?.generationMetadata;
  assert.equal(md?.motifAuthorityV1, true, 'Expected motifAuthorityV1 to be enabled in metadata');
  assert.ok(md?.motifPlan, 'Expected motifPlan metadata');
  assert.ok(md?.motifFingerprint, 'Expected motifFingerprint metadata');
  assert.ok(md?.variationType, 'Expected variationType metadata');
  assert.ok(typeof md?.returnSimilarity === 'number', 'Expected numeric returnSimilarity');
  assert.ok(typeof md?.motifAuthorityScore === 'number', 'Expected numeric motifAuthorityScore');
  assert.ok(typeof md?.literalCopyPenalty === 'number', 'Expected numeric literalCopyPenalty');
  assert.ok(typeof md?.overDriftPenalty === 'number', 'Expected numeric overDriftPenalty');

  const threshold = md?.motifPlan?.returnThreshold ?? 0.5;
  const returnSimilarity = md?.returnSimilarity ?? 0;
  assert.ok(
    returnSimilarity >= threshold,
    `Expected returnSimilarity >= threshold (${threshold}), got ${returnSimilarity}`
  );

  const devSimilarity = md?.motifPlan?.developmentSimilarity ?? 0;
  const [lo, hi] = md?.motifPlan?.variationMiddleBand ?? [0.2, 0.95];
  assert.ok(
    devSimilarity >= lo && devSimilarity <= hi,
    `Expected development similarity in middle band [${lo}, ${hi}], got ${devSimilarity}`
  );

  console.log(
    'MotifAuthority ON:',
    JSON.stringify(
      {
        returnSimilarity,
        motifAuthorityScore: md?.motifAuthorityScore,
        contourPenalty: md?.literalCopyPenalty,
        driftPenalty: md?.overDriftPenalty,
        variationType: md?.variationType,
      },
      null,
      2
    )
  );
}

function testMotifAuthorityOffInvariant(): void {
  const base = runGoldenPath(SEED, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    bpm: 100,
    longFormEnabled: true,
  });
  const off = runGoldenPath(SEED, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    bpm: 100,
    longFormEnabled: true,
    motifAuthorityV1: false,
  });

  assert.equal(
    JSON.stringify(base.score),
    JSON.stringify(off.score),
    'Expected score output identical when motifAuthorityV1 is OFF'
  );
  console.log('MotifAuthority OFF invariance: PASS');
}

function main(): void {
  testMotifAuthorityOn();
  testMotifAuthorityOffInvariant();
  console.log('test:motif-authority PASS');
}

main();
