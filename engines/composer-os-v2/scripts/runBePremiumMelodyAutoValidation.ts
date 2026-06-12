/**
 * V87 Commit 2c — Bill Evans premium-melody auto-validation (FROZEN thresholds).
 * Runs golden path seed 90301 on native lyrical benchmark BE_Benchmark_LyricalBallad.musicxml.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runBePremiumMelodyAutoValidation.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { runBeGoldenPath } from '../tests/beGoldenMaster.test';
import { runPremiumMelodyHarmonyRhythmExpressionPipeline } from '../core/premium-melody/premiumMelodyRouting';
import { buildBillEvansIsolationProvisionalProfile } from '../core/bill-evans/bePremiumMelodyProfile';
import {
  BE_GUIDE_TONE_PROXIMITY_MAX,
  BE_GUIDE_TONE_PROXIMITY_MIN,
  BE_GUIDE_TONE_EXACT_HIT_RATE_MAX,
  BE_GUIDE_TONE_EXACT_HIT_RATE_MIN,
  validateBePremiumMelodyConformance,
} from '../core/bill-evans/bePremiumMelodyValidation';
import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import { melodyOffbeatRatio } from '../core/premium-melody/premiumMelodyMetrics';
import { runPremiumMelodyPitchPipeline } from '../core/premium-melody/premiumMelodyPitchPipeline';

const BE_QA_PATH = path.join(
  'C:',
  'Users',
  'mike',
  'Documents',
  'Mike Composer Files',
  'Song Mode',
  'be-v86-2c-check.musicxml'
);

const BENCHMARK_FIXTURE = path.join(
  __dirname,
  '..',
  'core',
  'bill-evans',
  'test-fixtures',
  'BE_Benchmark_LyricalBallad.musicxml'
);

const BE_GOLDEN_SEED = 90301;

function main(): void {
  console.log('=== Bill Evans V87 Commit 2c Auto-Validation ===');
  console.log('Seed: ' + BE_GOLDEN_SEED);

  if (!fs.existsSync(BENCHMARK_FIXTURE)) {
    console.error('FAIL - benchmark fixture missing: ' + BENCHMARK_FIXTURE);
    process.exit(1);
  }

  let xml: string;
  try {
    const result = runBeGoldenPath();
    xml = result.xml;
  } catch (e) {
    console.error('FAIL - golden path error:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const ir = musicXmlToImportTimeline(fs.readFileSync(BENCHMARK_FIXTURE, 'utf8'));
  const rawMelodyLine = ir.melodyLine ?? [];
  console.log('Raw melody notes from fixture: ' + rawMelodyLine.length);

  const profile = buildBillEvansIsolationProvisionalProfile();
  const harmonyByBar: Record<number, string> = {};
  for (const h of ir.harmonyByBar) {
    harmonyByBar[h.bar] = h.chordSymbol;
  }
  const pipelineOpts = { harmonyByBar };

  const { rhythmMelody, exportMelody, rhythmMeta } =
    runPremiumMelodyHarmonyRhythmExpressionPipeline(rawMelodyLine, profile, BE_GOLDEN_SEED, pipelineOpts);

  const pitchResult =
    profile.pitchProfile != null
      ? runPremiumMelodyPitchPipeline(
          rhythmMelody,
          profile,
          profile.pitchProfile,
          BE_GOLDEN_SEED,
          pipelineOpts
        )
      : null;
  const pitchMelody = pitchResult?.pitchMelody ?? rhythmMelody;

  const postTrimOffbeatRatio = melodyOffbeatRatio(rhythmMelody);
  const rhythmMetaForValidation = { ...rhythmMeta, offbeatRatio: postTrimOffbeatRatio };

  const familySummary = Object.entries(rhythmMeta.familyCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([f, c]) => f + '=' + c)
    .join(', ');
  console.log('Family counts: ' + familySummary);

  const validation = validateBePremiumMelodyConformance(rhythmMelody, exportMelody, rhythmMetaForValidation, {
    importMelody: rawMelodyLine,
    pitchMelody,
    slotList: pitchResult?.slotList,
    pitchTrace: pitchResult?.pitchTrace,
  });

  console.log('\n--- Validation Results (2c FROZEN) ---');
  console.log(
    'offbeatRatio: ' +
      validation.offbeatRatio.toFixed(3) +
      ' [' +
      validation.offbeatRatioMin +
      ', ' +
      validation.offbeatRatioMax +
      '] -> ' +
      (validation.offbeatRatioPass ? 'PASS' : 'FAIL')
  );
  console.log(
    'ioiEntropy:   ' +
      validation.ioiEntropy.toFixed(3) +
      ' [' +
      validation.ioiEntropyMin +
      ', ' +
      validation.ioiEntropyMax +
      '] -> ' +
      (validation.ioiEntropyPass ? 'PASS' : 'FAIL')
  );
  console.log(
    'velocitySpread: ' +
      validation.velocitySpread +
      ' (min=' +
      validation.velocityMin +
      ', max=' +
      validation.velocityMax +
      ') [' +
      validation.velocitySpreadMin +
      ', ' +
      validation.velocitySpreadMax +
      '] -> ' +
      (validation.velocitySpreadPass ? 'PASS' : 'FAIL')
  );

  if (validation.pitchV2) {
    const v2 = validation.pitchV2;
    console.log('climaxArc:      ' + (v2.climaxPass ? 'PASS' : 'FAIL'));
    console.log(
      'guideToneProx:  ' +
        v2.guideToneProximityAvg.toFixed(3) +
        ' [' +
        BE_GUIDE_TONE_PROXIMITY_MIN +
        ', ' +
        BE_GUIDE_TONE_PROXIMITY_MAX +
        '] -> ' +
        (v2.guideToneProximityPass ? 'PASS' : 'FAIL')
    );
    console.log(
      'guideToneHit:   ' +
        v2.guideToneExactHitRateAvg.toFixed(3) +
        ' [' +
        BE_GUIDE_TONE_EXACT_HIT_RATE_MIN +
        ', ' +
        BE_GUIDE_TONE_EXACT_HIT_RATE_MAX +
        '] -> ' +
        (v2.guideToneExactHitRatePass ? 'PASS' : 'FAIL')
    );
    console.log(
      'approachRate:   ' +
        v2.approachBoundaryRate.toFixed(3) +
        ' (' +
        v2.chordBoundaryCount +
        ' boundaries) >= 0.50 -> ' +
        (v2.approachBoundaryPass ? 'PASS' : 'FAIL')
    );
  }

  if (validation.pitchTrace) {
    const pt = validation.pitchTrace;
    console.log(
      'pitchDifferRate: ' +
        pt.differRate.toFixed(3) +
        ' >= ' +
        pt.differRateMin +
        ' -> ' +
        (pt.differRatePass ? 'PASS' : 'FAIL')
    );
    console.log(
      'stepwiseMotion:  ' +
        pt.stepwiseRate.toFixed(3) +
        ' >= ' +
        pt.stepwiseRateMin +
        ' (' +
        pt.motionPairs +
        ' pairs) -> ' +
        (pt.stepwiseRatePass ? 'PASS' : 'FAIL')
    );
    console.log(
      'largeLeapRate:   ' +
        pt.largeLeapRate.toFixed(3) +
        ' <= ' +
        pt.largeLeapMax +
        ' -> ' +
        (pt.largeLeapPass ? 'PASS' : 'FAIL')
    );
  }

  if (validation.details.length > 0) {
    console.log('\nFailures:');
    for (const d of validation.details) console.log('  - ' + d);
  }

  console.log('\nOverall: ' + (validation.pass ? 'PASS' : 'FAIL'));

  const qaDir = path.dirname(BE_QA_PATH);
  if (fs.existsSync(qaDir)) {
    fs.writeFileSync(BE_QA_PATH, xml, 'utf8');
    console.log('\nQA MusicXML written to: ' + BE_QA_PATH);
  } else {
    console.log('\nSong Mode dir not found, skipping XML write: ' + qaDir);
  }

  if (!validation.pass) {
    process.exit(1);
  }
}

main();
