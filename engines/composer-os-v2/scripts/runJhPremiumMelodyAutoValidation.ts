/**
 * V89 Commit 2a/2b — Jimi Hendrix premium-melody auto-validation (PROVISIONAL thresholds).
 * Runs golden path seed 90303 on BH isolation benchmark.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runJhPremiumMelodyAutoValidation.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { runJhGoldenPath } from '../tests/jhGoldenMaster.test';
import { runPremiumMelodyHarmonyRhythmExpressionPipeline } from '../core/premium-melody/premiumMelodyRouting';
import { buildHendrixIsolationProvisionalProfile } from '../core/hendrix/jhPremiumMelodyProfile';
import {
  JH_CALL_RESPONSE_SIMILARITY_TARGET,
  validateJhPremiumMelodyConformance,
} from '../core/hendrix/jhPremiumMelodyValidation';
import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import { melodyOffbeatRatio } from '../core/premium-melody/premiumMelodyMetrics';
import { runPremiumMelodyPitchPipeline } from '../core/premium-melody/premiumMelodyPitchPipeline';

const JH_QA_PATH = path.join(
  'C:',
  'Users',
  'mike',
  'Documents',
  'Mike Composer Files',
  'Song Mode',
  'jh-v86-2a2b-check.musicxml'
);

const BENCHMARK_FIXTURE = path.join(
  __dirname,
  '..',
  'core',
  'barry-harris',
  'test-fixtures',
  'BH_Benchmark_JazzMelody.musicxml'
);

const JH_GOLDEN_SEED = 90303;

function main(): void {
  console.log('=== Jimi Hendrix V89 Commit 2a/2b Auto-Validation ===');
  console.log('Seed: ' + JH_GOLDEN_SEED);

  if (!fs.existsSync(BENCHMARK_FIXTURE)) {
    console.error('FAIL - benchmark fixture missing: ' + BENCHMARK_FIXTURE);
    process.exit(1);
  }

  let xml: string;
  try {
    const result = runJhGoldenPath();
    xml = result.xml;
  } catch (e) {
    console.error('FAIL - golden path error:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const ir = musicXmlToImportTimeline(fs.readFileSync(BENCHMARK_FIXTURE, 'utf8'));
  const rawMelodyLine = ir.melodyLine ?? [];
  console.log('Raw melody notes from fixture: ' + rawMelodyLine.length);

  const profile = buildHendrixIsolationProvisionalProfile();
  const harmonyByBar: Record<number, string> = {};
  for (const h of ir.harmonyByBar) {
    harmonyByBar[h.bar] = h.chordSymbol;
  }
  const pipelineOpts = { harmonyByBar };

  const { rhythmMelody, exportMelody, rhythmMeta } =
    runPremiumMelodyHarmonyRhythmExpressionPipeline(
      rawMelodyLine,
      profile,
      JH_GOLDEN_SEED,
      pipelineOpts
    );

  const pitchResult =
    profile.pitchProfile != null
      ? runPremiumMelodyPitchPipeline(
          rhythmMelody,
          profile,
          profile.pitchProfile,
          JH_GOLDEN_SEED,
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

  const validation = validateJhPremiumMelodyConformance(rhythmMelody, exportMelody, rhythmMetaForValidation, {
    pitchMelody,
    slotList: pitchResult?.slotList,
    pitchTrace: pitchResult?.pitchTrace,
  });

  console.log('\n--- Validation Results (PROVISIONAL) ---');
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

  if (validation.pitchMechanisms) {
    const pm = validation.pitchMechanisms;
    console.log(
      'pentatonicAnchor: ' +
        pm.pentatonicAnchorHitRate.toFixed(3) +
        ' >= ' +
        pm.pentatonicAnchorHitRateMin +
        ' -> ' +
        (pm.pentatonicAnchorPass ? 'PASS' : 'FAIL')
    );
    console.log(
      'bluesInflection: ' +
        pm.bluesInflectionNoteCount +
        ' >= ' +
        pm.bluesInflectionNoteMin +
        ' -> ' +
        (pm.bluesInflectionPass ? 'PASS' : 'FAIL')
    );
    console.log(
      'riffCellRecall: ' +
        pm.riffCellSlotCount +
        ' >= ' +
        pm.riffCellSlotMin +
        ' -> ' +
        (pm.riffCellRecallPass ? 'PASS' : 'FAIL')
    );
    console.log(
      'callResponseSim: ' +
        pm.callResponseSimilarityAvg.toFixed(3) +
        ' [' +
        pm.callResponseSimilarityMin +
        ', ' +
        pm.callResponseSimilarityMax +
        '] target ' +
        JH_CALL_RESPONSE_SIMILARITY_TARGET +
        ' (' +
        pm.responseSlotCount +
        ' slots) -> ' +
        (pm.callResponseSimilarityPass ? 'PASS' : 'FAIL')
    );
  }

  if (validation.details.length > 0) {
    console.log('\nFailures:');
    for (const d of validation.details) console.log('  - ' + d);
  }

  console.log('\nOverall: ' + (validation.pass ? 'PASS' : 'FAIL'));

  const qaDir = path.dirname(JH_QA_PATH);
  if (fs.existsSync(qaDir)) {
    fs.writeFileSync(JH_QA_PATH, xml, 'utf8');
    console.log('\nQA MusicXML written to: ' + JH_QA_PATH);
  } else {
    console.log('\nSong Mode dir not found, skipping XML write: ' + qaDir);
  }

  if (!validation.pass) {
    process.exit(1);
  }
}

main();
