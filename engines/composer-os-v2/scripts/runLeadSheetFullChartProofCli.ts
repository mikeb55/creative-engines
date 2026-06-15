/**
 * CLI - full-chart leadsheet proof (8-bar regression + >8-bar Metaphysics).
 * Run: npx tsx engines/composer-os-v2/scripts/runLeadSheetFullChartProofCli.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { assembleDebussyLeadSheetQuintetWithHandoffScore } from '../core/import/assembleDebussyLeadSheetQuintetWithHandoffScore';
import { buildLeadSheetMelodyHandoffPlan } from '../core/import/debussyLeadSheetMelodyHandoffPlan';
import { loadDebussyLeadSheetImportTimelineFromMusicXmlFile } from '../core/import/loadDebussyLeadSheetImportTimelineFromMusicXmlFile';
import { EXPECTED_QUINTET_PART_IDS } from '../core/import/runDebussyLeadSheetQuintetProof';
import {
  resolveMetaphysicsLeadSheetProofPath,
  resolveOrbitLeadSheetProofPath,
} from '../core/import/resolveOrbitLeadSheetProofPath';
import { runLeadSheetGceLockEval } from '../core/import/leadSheetGceLockEvalRunner';

const COMPOSERS = ['debussy', 'kenny_wheeler', 'bartok'] as const;
const SEED = 90106;

function maxBarInScore(score: { parts: { measures: { index: number }[] }[] }): number {
  let max = 0;
  for (const part of score.parts) {
    for (const m of part.measures) max = Math.max(max, m.index);
  }
  return max;
}

function runFileProof(label: string, filePath: string) {
  const tl = loadDebussyLeadSheetImportTimelineFromMusicXmlFile(filePath);
  const handoffPlan = buildLeadSheetMelodyHandoffPlan(tl.bars);
  console.log(`\n=== ${label} ===`);
  console.log(`file: ${filePath}`);
  console.log(`input bars: ${tl.bars}`);
  console.log(
    `handoff segments (${handoffPlan.length}):`,
    handoffPlan.map((s) => `${s.startBar}-${s.endBar}:${s.melodyPartId}`).join(' | '),
  );

  for (const composerId of COMPOSERS) {
    const result = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tl, composerId);
    const outBars = maxBarInScore(result.score);
    const quintetOk =
      result.partIds.length === 5 &&
      EXPECTED_QUINTET_PART_IDS.every((id, i) => result.partIds[i] === id) &&
      !result.hasBassPart;
    const exportOk = exportScoreModelToMusicXml(result.score).success === true;
    console.log(
      `  ${composerId}: outputBars=${outBars} parts=${result.partIds.join(',')} quintet=${quintetOk} export=${exportOk} handoff=${result.handoffVariationDetected}`,
    );
    if (!quintetOk || !exportOk || outBars !== tl.bars) {
      process.exitCode = 1;
    }
  }
}

const orbit = resolveOrbitLeadSheetProofPath(path.join(__dirname, '..'));
const metaphysics = resolveMetaphysicsLeadSheetProofPath(path.join(__dirname, '..'));

if (!orbit) {
  console.error('Orbit 8-bar fixture not found');
  process.exit(1);
}
runFileProof('Orbit 8-bar regression', orbit);

if (!metaphysics) {
  console.error('Metaphysics long-form fixture not found');
  process.exit(1);
}
runFileProof('Metaphysics full chart', metaphysics);

if (process.env.LEADSHEET_GCE_LOCK_DUMP === '1' && metaphysics) {
  const tl = loadDebussyLeadSheetImportTimelineFromMusicXmlFile(metaphysics);
  const { score } = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tl, 'debussy');
  const evalResult = runLeadSheetGceLockEval({
    score,
    composerId: 'debussy',
    seed: SEED,
    sourceFile: metaphysics,
  });
  const dumpDir = path.join(__dirname, '..', 'output', 'leadsheet-full-chart-proof');
  fs.mkdirSync(dumpDir, { recursive: true });
  const outPath = path.join(dumpDir, 'metaphysics-debussy-gce-lock.json');
  fs.writeFileSync(outPath, JSON.stringify(evalResult, null, 2), 'utf8');
  console.log('\nGCE fragment-limited categories (Metaphysics 40-bar):');
  for (const cat of ['structureAndForm', 'thematicRecallPotential', 'phraseGrammar', 'cadentialClarity'] as const) {
    console.log(`  ${cat}: ${evalResult.gce.categories[cat]}`);
  }
  console.log('Wrote', outPath);
}

console.log('\nDone.');