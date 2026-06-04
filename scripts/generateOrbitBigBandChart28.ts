/**
 * Orbit Big Band 120-bar chart — formId orbit_28, 28-bar chord cycle, profile orbit_28_v1.
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/generateOrbitBigBandChart28.ts
 *
 * Valid engine inputs (reference):
 *   ensembleConfigId: 'full_band' | 'medium_band' | 'small_band' | 'reeds_only' | 'brass_only' | 'custom'
 *   creativeControlLevel: 'stable' | 'balanced' | 'surprise'
 *   drumIntensity: 'sparse' | 'standard' | 'driving'
 *   feelMode: 'in2' | 'in4'
 *   era: 'swing' | 'bebop' | 'post_bop' | 'contemporary' | 'cool_jazz' | 'hard_bop' | 'fusion'
 */

import fs from 'fs';
import path from 'path';
import { runBigBandRealisation } from '../engines/composer-os-v2/core/big-band/runBigBandRealisation';

const OUT_DIR = 'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band';
const OUT_FILE = path.join(OUT_DIR, 'orbit_big_band_v1.musicxml');

/** Canonical 28-bar Orbit cycle (matches scripts/orbitArrangingPlan28.ts). */
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

function main(): void {
  const realised = runBigBandRealisation({
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
    bigBandArrangementProfile: 'orbit_28_v1',
    // BB_DESIGNATED_SAX_SOLI_START/END (bars 17–24) conflicts with Orbit G-major bridge;
    // solo engine parts merged manually in v1.8p2 — suppress auto sax-soli substitute.
    suppressDesignatedSaxSoli: true,
  });

  const planningOk = realised.planning.validation.ok;
  console.log('--- Planning validation ---');
  console.log('ok:', planningOk);
  if (!planningOk) {
    console.log('errors:', realised.planning.validation.errors);
    throw new Error(`Planning validation failed: ${realised.planning.validation.errors.join('; ')}`);
  }
  console.log('form totalBars:', realised.planning.formPlan.totalBars);
  console.log(
    'form slices:',
    realised.planning.formPlan.slices.map((s) => `${s.phase} ${s.startBar}-${s.endBar}`).join(', ')
  );

  console.log('\n--- Voicing validation ---');
  console.log('ok:', realised.voicingValidation.ok);
  if (!realised.voicingValidation.ok) {
    console.log('errors:', realised.voicingValidation.errors);
    throw new Error(`Voicing validation failed: ${realised.voicingValidation.errors.join('; ')}`);
  }

  console.log('\n--- Score / export ---');
  console.log('score defined:', realised.score !== undefined ? 'yes' : 'no');
  if (!realised.score) {
    throw new Error('Score model undefined after successful planning');
  }
  console.log('score parts:', realised.score.parts.length);
  console.log(
    'score bars (first part):',
    realised.score.parts[0]?.measures.length ?? 0
  );

  const exportOk = realised.exportPipeline.ok;
  console.log('export ok:', exportOk);
  if (!exportOk) {
    console.log('export errors:', realised.exportPipeline.errors);
    throw new Error(`Export failed: ${realised.exportPipeline.errors.join('; ')}`);
  }

  const xml = realised.exportPipeline.xml?.trim();
  if (!xml) {
    throw new Error('Export reported ok but XML is empty');
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, xml, 'utf8');

  const stat = fs.statSync(OUT_FILE);
  const sizeKb = Math.round((stat.size / 1024) * 10) / 10;
  console.log('\n--- Output ---');
  console.log('path:', OUT_FILE);
  console.log('size KB:', sizeKb);
  console.log('exists:', fs.existsSync(OUT_FILE));
  console.log('size > 0:', stat.size > 0);

  if (!fs.existsSync(OUT_FILE) || stat.size <= 0) {
    throw new Error(`Output file missing or empty: ${OUT_FILE}`);
  }

  if (realised.score.wybleConsumptionReceipt) {
    console.log('wyble receipt:', realised.score.wybleConsumptionReceipt);
  }
}

main();
