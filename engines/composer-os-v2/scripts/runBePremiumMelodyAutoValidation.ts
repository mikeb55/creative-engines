/**
 * V87 Commit 2a - Bill Evans premium-melody auto-validation.
 * Runs golden path seed 90301 on BH isolation benchmark (2a).
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runBePremiumMelodyAutoValidation.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { runBeGoldenPath } from '../tests/beGoldenMaster.test';
import { runPremiumMelodyHarmonyRhythmExpressionPipeline } from '../core/premium-melody/premiumMelodyRouting';
import { buildBillEvansIsolationProvisionalProfile } from '../core/bill-evans/bePremiumMelodyProfile';
import { validateBePremiumMelodyConformance } from '../core/bill-evans/bePremiumMelodyValidation';
import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import { melodyOffbeatRatio } from '../core/premium-melody/premiumMelodyMetrics';

const BE_QA_PATH = path.join('C:', 'Users', 'mike', 'Documents', 'Mike Composer Files', 'Song Mode', 'be-v86-2a-check.musicxml');

const BENCHMARK_FIXTURE = path.join(
  __dirname,
  '..',
  'core',
  'barry-harris',
  'test-fixtures',
  'BH_Benchmark_JazzMelody.musicxml'
);

const BE_GOLDEN_SEED = 90301;

function main(): void {
  console.log('=== Bill Evans V87 Commit 2a Auto-Validation ===');
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
  const { rhythmMelody, exportMelody, rhythmMeta } =
    runPremiumMelodyHarmonyRhythmExpressionPipeline(rawMelodyLine, profile, BE_GOLDEN_SEED);

  const postTrimOffbeatRatio = melodyOffbeatRatio(rhythmMelody);
  const rhythmMetaForValidation = { ...rhythmMeta, offbeatRatio: postTrimOffbeatRatio };

  const familySummary = Object.entries(rhythmMeta.familyCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([f, c]) => f + '=' + c)
    .join(', ');
  const longGapCount = rhythmMeta.familyCounts['long_gap'] ?? 0;
  const delayedCount = rhythmMeta.familyCounts['delayed'] ?? 0;
  const combinedShare = rhythmMeta.totalNotes > 0 ? ((longGapCount + delayedCount) / rhythmMeta.totalNotes) * 100 : 0;

  console.log('Family counts: ' + familySummary);
  console.log('long_gap+delayed combined share: ' + combinedShare.toFixed(1) + '% (informational)');

  const validation = validateBePremiumMelodyConformance(rhythmMelody, exportMelody, rhythmMetaForValidation);

  console.log('\n--- Validation Results ---');
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
      ' >= ' +
      validation.ioiEntropyMin +
      ' -> ' +
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
