/**
 * BB101 — full 120-bar big-band MusicXML (melody lock + SD3 drums + GCE loop).
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/generateBB101BigBand.ts
 *
 * Output: C:\Users\mike\Documents\Mike Cubase Files\June 26 Cubase files\BB101_big_band.musicxml
 */

import fs from 'fs';
import path from 'path';
import { runBigBandRealisation } from '../engines/composer-os-v2/core/big-band/runBigBandRealisation';
import { buildBb101ChordProgressionText } from '../engines/composer-os-v2/core/big-band/bb101HarmonicMap';
import { buildBb101LeadSheetFromMidi } from '../engines/composer-os-v2/core/big-band/bb101SketchImport';
import { applyBb101Sd3DrumOverlay } from '../engines/composer-os-v2/core/big-band/bb101Sd3DrumOverlay';
import { runEnsembleExportPipeline } from '../engines/composer-os-v2/core/export/ensembleExport';
import {
  createBb101GceFixState,
  type Bb101GceCriterion,
} from '../engines/composer-os-v2/core/big-band/bb101BbArrangement';
import {
  evaluateBb101Gce,
  formatBb101GceLoopReport,
  lowestBb101GceCriterion,
} from '../engines/composer-os-v2/core/big-band/bb101GceEval';
import { applyBb101Pass3ScorePasses } from '../engines/composer-os-v2/core/big-band/bb101ScorePasses';

export const BB101_SRC_MID =
  'C:\\Users\\mike\\Documents\\Mike Cubase Files\\June 26 Cubase files\\BB101.mid';
export const BB101_OUT_DIR =
  'C:\\Users\\mike\\Documents\\Mike Cubase Files\\June 26 Cubase files';
export const BB101_OUT_FILE = path.join(BB101_OUT_DIR, 'BB101_big_band.musicxml');

const GCE_TARGET = 8.5;
const MAX_LOOPS = 6;

/** Pass 3 — apply from loop 1 (GCE gate: development not density). */
const PASS3_BASE: Bb101GceCriterion[] = [
  'register_architecture',
  'motivic_development',
  'brass_architecture',
  'shout_quality',
  'dropout_events',
];

function realiseBb101(appliedFixes: Bb101GceCriterion[]) {
  const leadSheet = buildBb101LeadSheetFromMidi(BB101_SRC_MID, { seed: 10101, totalBars: 120 });
  return runBigBandRealisation({
    seed: 10101,
    title: 'BB101',
    bpm: 90,
    totalBars: 120,
    formId: 'bb101_120',
    chordProgressionText: buildBb101ChordProgressionText(),
    era: 'post_bop',
    ensembleConfigId: 'full_band',
    creativeControlLevel: 'stable',
    drumIntensity: 'standard',
    feelMode: 'in4',
    bigBandArrangementProfile: 'bb101_v1',
    suppressDesignatedSaxSoli: true,
    leadSheet,
    bb101GceFixes: createBb101GceFixState(appliedFixes),
  });
}

function finalizeScore(
  score: NonNullable<ReturnType<typeof runBigBandRealisation>['score']>,
  appliedFixes: Bb101GceCriterion[]
) {
  applyBb101Pass3ScorePasses(score, appliedFixes);
  applyBb101Sd3DrumOverlay(score);
}

function exportScore(score: NonNullable<ReturnType<typeof runBigBandRealisation>['score']>, bpm: number) {
  return runEnsembleExportPipeline(score, { bpm });
}

function main(): void {
  const appliedFixes: Bb101GceCriterion[] = [...PASS3_BASE];
  const loopReports: string[] = [];
  let finalScores;
  let realised = realiseBb101(appliedFixes);

  if (!realised.planning.validation.ok) {
    throw new Error(`Planning failed: ${realised.planning.validation.errors.join('; ')}`);
  }
  if (!realised.voicingValidation.ok) {
    throw new Error(`Voicing failed: ${realised.voicingValidation.errors.join('; ')}`);
  }

  for (let loop = 1; loop <= MAX_LOOPS; loop++) {
    if (!realised.score) {
      throw new Error('Score undefined');
    }
    finalizeScore(realised.score, appliedFixes);
    finalScores = evaluateBb101Gce(realised.score);

    let action: string;
    if (finalScores.mean >= GCE_TARGET) {
      action = 'TARGET REACHED';
      loopReports.push(formatBb101GceLoopReport(loop, finalScores, action));
      break;
    }

    if (loop === MAX_LOOPS) {
      action = 'PLATEAU — max loops reached';
      loopReports.push(formatBb101GceLoopReport(loop, finalScores, action));
      break;
    }

    const weakest = lowestBb101GceCriterion(finalScores, appliedFixes);
    if (!appliedFixes.includes(weakest)) {
      appliedFixes.push(weakest);
      action = `Applied targeted fix: ${weakest}`;
    } else {
      action = `PLATEAU — fix ${weakest} already applied`;
      loopReports.push(formatBb101GceLoopReport(loop, finalScores, action));
      break;
    }
    loopReports.push(formatBb101GceLoopReport(loop, finalScores, action));
    realised = realiseBb101(appliedFixes);
    if (!realised.score) throw new Error('Score undefined after regen');
  }

  console.log('=== BB101 PASS 3 — GCE LOOP (melody lock + SD3 + score passes) ===\n');
  for (const r of loopReports) console.log(r + '\n');

  if (!realised.score) throw new Error('No score');
  finalizeScore(realised.score, appliedFixes);
  finalScores = evaluateBb101Gce(realised.score);
  const exportPipeline = exportScore(realised.score, 90);
  if (!exportPipeline.ok || !exportPipeline.xml?.trim()) {
    throw new Error(`Export failed: ${exportPipeline.errors?.join('; ')}`);
  }

  fs.mkdirSync(BB101_OUT_DIR, { recursive: true });
  fs.writeFileSync(BB101_OUT_FILE, exportPipeline.xml.trim(), 'utf8');

  const stat = fs.statSync(BB101_OUT_FILE);
  const melodyBars = new Set(
    buildBb101LeadSheetFromMidi(BB101_SRC_MID).melodyEvents.map((e) => e.bar)
  ).size;

  console.log('--- Output ---');
  console.log('path:', BB101_OUT_FILE);
  console.log('size KB:', Math.round((stat.size / 1024) * 10) / 10);
  console.log('parts:', realised.score.parts.length);
  console.log('bars:', realised.score.parts[0]?.measures.length);
  console.log('locked melody active bars:', melodyBars);
  if (finalScores) {
    console.log('GCE final:', formatBb101GceLoopReport(0, finalScores, 'post-export'));
  }
  console.log('fixes:', appliedFixes.join(', ') || 'none');
}

main();
