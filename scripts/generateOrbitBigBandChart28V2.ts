/**
 * Orbit Big Band 120-bar chart V2 — formId orbit_28, profile orbit_28_v2.
 * Three-pass orchestration + GCE improvement loop (max 5).
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/generateOrbitBigBandChart28V2.ts
 *
 * Output: C:\Users\mike\Documents\Mike Composer Files\Orbit Big Band\orbit_big_band_v2.musicxml
 * Does NOT overwrite orbit_big_band_v1.musicxml or orbit_28_v1 profile behaviour.
 */

import fs from 'fs';
import path from 'path';
import { runBigBandRealisation } from '../engines/composer-os-v2/core/big-band/runBigBandRealisation';
import {
  createOrbit28V2GceFixState,
  type Orbit28V2GceCriterion,
} from '../engines/composer-os-v2/core/big-band/orbitBbV28V2Arrangement';
import {
  evaluateOrbit28V2Gce,
  formatGceLoopReport,
  lowestOrbit28V2GceCriterion,
} from '../engines/composer-os-v2/core/big-band/orbit28V2GceEval';

const OUT_DIR = 'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band';
const OUT_FILE = path.join(OUT_DIR, 'orbit_big_band_v2.musicxml');

const ORBIT_28_CHORD_PROGRESSION = [
  'N.C.',
  'Fmaj7',
  'Ebmaj7',
  'Dbmaj7',
  'Bmaj7',
  'Bbm9',
  'Abmaj7',
  'Gbmaj7',
  'Ebmaj7',
  'Fmaj7',
  'Ebmaj7',
  'Dbmaj7',
  'Bmaj7',
  'Bbm9',
  'N.C.',
  'Gbmaj7',
  'Emaj7',
  'G',
  'G',
  'Eb',
  'Eb',
  'G',
  'G',
  'G',
  'Dbmaj7',
  'Bb7',
  'Fmaj7',
  'N.C.',
].join(' | ');

const GCE_TARGET = 8.5;
const MAX_LOOPS = 5;

function realiseOrbit28V2(appliedFixes: Orbit28V2GceCriterion[]) {
  return runBigBandRealisation({
    seed: 1001,
    title: 'Orbit',
    bpm: 90,
    totalBars: 120,
    formId: 'orbit_28',
    chordProgressionText: ORBIT_28_CHORD_PROGRESSION,
    era: 'post_bop',
    ensembleConfigId: 'full_band',
    creativeControlLevel: 'stable',
    drumIntensity: 'standard',
    feelMode: 'in4',
    bigBandArrangementProfile: 'orbit_28_v2',
    suppressDesignatedSaxSoli: true,
    orbit28V2GceFixes: createOrbit28V2GceFixState(appliedFixes),
  });
}

function main(): void {
  const appliedFixes: Orbit28V2GceCriterion[] = [];
  const loopReports: string[] = [];
  let finalScores;
  let realised = realiseOrbit28V2(appliedFixes);

  for (let loop = 1; loop <= MAX_LOOPS; loop++) {
    if (!realised.score) {
      throw new Error('Score model undefined after successful planning');
    }
    finalScores = evaluateOrbit28V2Gce(realised.score);

    let action: string;
    if (finalScores.mean >= GCE_TARGET) {
      action = 'TARGET REACHED';
      loopReports.push(formatGceLoopReport(loop, finalScores, action));
      break;
    }

    if (loop === MAX_LOOPS) {
      action = 'PLATEAU — max loops reached';
      loopReports.push(formatGceLoopReport(loop, finalScores, action));
      break;
    }

    const weakest = lowestOrbit28V2GceCriterion(finalScores, appliedFixes);
    if (!appliedFixes.includes(weakest)) {
      appliedFixes.push(weakest);
      action = `Applied targeted fix: ${weakest}`;
    } else {
      action = `PLATEAU — fix ${weakest} already applied, no gain`;
      loopReports.push(formatGceLoopReport(loop, finalScores, action));
      break;
    }
    loopReports.push(formatGceLoopReport(loop, finalScores, action));
    realised = realiseOrbit28V2(appliedFixes);
  }

  console.log('=== GCE LOOP RESULTS ===\n');
  for (const r of loopReports) {
    console.log(r);
    console.log('');
  }

  if (!realised.planning.validation.ok) {
    throw new Error(`Planning failed: ${realised.planning.validation.errors.join('; ')}`);
  }
  if (!realised.voicingValidation.ok) {
    throw new Error(`Voicing failed: ${realised.voicingValidation.errors.join('; ')}`);
  }
  if (!realised.score) {
    throw new Error('Score undefined');
  }
  if (!realised.exportPipeline.ok || !realised.exportPipeline.xml?.trim()) {
    throw new Error(`Export failed: ${realised.exportPipeline.errors?.join('; ')}`);
  }

  finalScores = evaluateOrbit28V2Gce(realised.score);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, realised.exportPipeline.xml.trim(), 'utf8');

  const stat = fs.statSync(OUT_FILE);
  const sizeKb = Math.round((stat.size / 1024) * 10) / 10;
  const barCount = realised.score.parts[0]?.measures.length ?? 0;
  const partCount = realised.score.parts.length;

  const weakCriteria = (
    [
      ['dynamic_arc', finalScores.dynamic_arc],
      ['sectional_contrast', finalScores.sectional_contrast],
      ['dropout_events', finalScores.dropout_events],
      ['shout_quality', finalScores.shout_quality],
      ['brass_architecture', finalScores.brass_architecture],
      ['sax_writing', finalScores.sax_writing],
      ['rhythm_breathing', finalScores.rhythm_breathing],
      ['human_playability', finalScores.human_playability],
    ] as const
  )
    .filter(([, s]) => s < 8.5)
    .map(([name]) => name);

  console.log('=== FINAL EXPORT ===');
  console.log('path:', OUT_FILE);
  console.log('profile: orbit_28_v2');
  console.log('parts:', partCount);
  console.log('bars:', barCount);
  console.log('size KB:', sizeKb);
  console.log('GCE mean:', finalScores.mean);
  console.log('GCE scores:', JSON.stringify(finalScores, null, 2));
  if (appliedFixes.length > 0) {
    console.log('GCE fixes applied:', appliedFixes.join(', '));
  }
  if (weakCriteria.length > 0) {
    console.log('Human review (Sibelius):', weakCriteria.join(', '));
  } else {
    console.log('Human review: none flagged');
  }
}

main();
