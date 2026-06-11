/**
 * V86 Commit 2b - Wayne Shorter premium-melody auto-validation.
 * Runs Wayne golden path seed 90217, validates against 2b modal float thresholds,
 * writes QA MusicXML to Song Mode folder.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runWsPremiumMelodyAutoValidation.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { runWsGoldenPath } from '../tests/wayneGoldenMaster.test';
import { runPremiumMelodyHarmonyRhythmExpressionPipeline } from '../core/premium-melody/premiumMelodyRouting';
import { buildWayneShorterIsolationProvisionalProfile } from '../core/wayne-shorter/wsPremiumMelodyProfile';
import { validateWsPremiumMelodyConformance } from '../core/wayne-shorter/wsPremiumMelodyValidation';
import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import { melodyOffbeatRatio } from '../core/premium-melody/premiumMelodyMetrics';

const WS_QA_PATH = path.join('C:', 'Users', 'mike', 'Documents', 'Mike Composer Files', 'Song Mode', 'ws-v86-2b-check.musicxml');

const BENCHMARK_FIXTURE = path.join(__dirname, '..', 'core', 'barry-harris', 'test-fixtures', 'BH_Benchmark_JazzMelody.musicxml');

const WS_GOLDEN_SEED = 90217;

function main(): void {
  console.log('=== Wayne Shorter V86 Commit 2b Auto-Validation ===');
  console.log('Seed: ' + WS_GOLDEN_SEED);

  if (!fs.existsSync(BENCHMARK_FIXTURE)) {
    console.error('FAIL - benchmark fixture missing: ' + BENCHMARK_FIXTURE);
    process.exit(1);
  }

  let xml: string;
  try {
    const result = runWsGoldenPath();
    xml = result.xml;
  } catch (e) {
    console.error('FAIL - golden path error:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  // Use raw input melody (pre-enrichment) to avoid double-enrichment
  const ir = musicXmlToImportTimeline(fs.readFileSync(BENCHMARK_FIXTURE, 'utf8'));
  const rawMelodyLine = ir.melodyLine ?? [];
  console.log('Raw melody notes from fixture: ' + rawMelodyLine.length);

  const wsProfile = buildWayneShorterIsolationProvisionalProfile();
  const { rhythmMelody, exportMelody, rhythmMeta } =
    runPremiumMelodyHarmonyRhythmExpressionPipeline(rawMelodyLine, wsProfile, WS_GOLDEN_SEED);

  // Post-trim offbeat ratio from rhythmMelody (not pre-trim meta value)
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
  console.log('long_gap+delayed combined share: ' + combinedShare.toFixed(1) + '% (target >=35%)');

  const validation = validateWsPremiumMelodyConformance(rhythmMelody, exportMelody, rhythmMetaForValidation);

  console.log('\\n--- Validation Results ---');
  console.log('offbeatRatio: ' + validation.offbeatRatio.toFixed(3) + ' [0.28, 0.52] -> ' + (validation.offbeatRatioPass ? 'PASS' : 'FAIL'));
  console.log('ioiEntropy:   ' + validation.ioiEntropy.toFixed(3) + ' >= 1.4 -> ' + (validation.ioiEntropyPass ? 'PASS' : 'FAIL'));
  console.log('velocitySpread: ' + validation.velocitySpread + ' (min=' + validation.velocityMin + ', max=' + validation.velocityMax + ') [4, 12] -> ' + (validation.velocitySpreadPass ? 'PASS' : 'FAIL'));

  if (validation.details.length > 0) {
    console.log('\\nFailures:');
    for (const d of validation.details) console.log('  - ' + d);
  }

  console.log('\\nOverall: ' + (validation.pass ? 'PASS' : 'FAIL'));

  const qaDir = path.dirname(WS_QA_PATH);
  if (fs.existsSync(qaDir)) {
    fs.writeFileSync(WS_QA_PATH, xml, 'utf8');
    console.log('\\nQA MusicXML written to: ' + WS_QA_PATH);
  } else {
    console.log('\\nSong Mode dir not found, skipping XML write: ' + qaDir);
  }

  if (!validation.pass) { process.exit(1); }
}

main();
