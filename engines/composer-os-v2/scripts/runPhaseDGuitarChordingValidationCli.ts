/**
 * Phase D validation + export for Metaphysics 40-bar guitar chording (seed 90106).
 * Run: npx tsx engines/composer-os-v2/scripts/runPhaseDGuitarChordingValidationCli.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { assembleDebussyLeadSheetQuintetWithHandoffScore } from '../core/import/assembleDebussyLeadSheetQuintetWithHandoffScore';
import { leadSheetOwnerMelodyPitchOrderKey } from '../core/import/leadSheetIdentityCellEchoPass';
import {
  applyLeadSheetGuitarChordingPass,
  leadSheetGuitarMelodyRhythmKey,
} from '../core/import/leadSheetGuitarChordingPass';
import { runLeadSheetGceLockEval } from '../core/import/leadSheetGceLockEvalRunner';
import { loadDebussyLeadSheetImportTimelineFromMusicXmlFile } from '../core/import/loadDebussyLeadSheetImportTimelineFromMusicXmlFile';
import {
  resolveMetaphysicsLeadSheetProofPath,
  resolveOrbitLeadSheetProofPath,
} from '../core/import/resolveOrbitLeadSheetProofPath';
import { scanQuintetSubSixteenthNotes } from '../core/import/leadSheetQuintetSixteenthGridClampPass';
import { runLeadSheetPhase7StringRealizationProofTests } from '../tests/leadSheetPhase7StringRealizationProof.test';

const SEED = 90106;
const COMPOSERS = ['bartok', 'debussy', 'kenny_wheeler'] as const;

const EXPORT_PATHS: Record<(typeof COMPOSERS)[number], string> = {
  bartok: path.join(__dirname, '..', 'output', 'metaphysics_40bar_90106_bartok_phaseD.musicxml'),
  debussy: path.join(__dirname, '..', 'output', 'metaphysics_40bar_90106_debussy_phaseD.musicxml'),
  kenny_wheeler: path.join(
    __dirname,
    '..',
    'output',
    'metaphysics_40bar_90106_kenny_wheeler_phaseD.musicxml',
  ),
};

function maxBar(score: { parts: { measures: { index: number }[] }[] }): number {
  let m = 0;
  for (const p of score.parts) {
    for (const bar of p.measures) m = Math.max(m, bar.index);
  }
  return m;
}

function meanDuration(score: ReturnType<typeof assembleDebussyLeadSheetQuintetWithHandoffScore>['score'], composerId: string): number {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  if (!guitar) return 0;
  const durs: number[] = [];
  for (const measure of guitar.measures) {
    for (const e of measure.events) {
      if ((e.kind === 'note' || e.kind === 'chord') && (e.voice ?? 1) === 2) {
        durs.push(e.duration);
      }
    }
  }
  if (durs.length === 0) return 0;
  return durs.reduce((a, b) => a + b, 0) / durs.length;
}

const metaphysics = resolveMetaphysicsLeadSheetProofPath(path.join(__dirname, '..'));
const orbit = resolveOrbitLeadSheetProofPath(path.join(__dirname, '..'));
if (!metaphysics || !orbit) {
  console.error('Fixtures missing');
  process.exit(1);
}

const tlMeta = loadDebussyLeadSheetImportTimelineFromMusicXmlFile(metaphysics);
const tlOrbit = loadDebussyLeadSheetImportTimelineFromMusicXmlFile(orbit);

const phase7 = runLeadSheetPhase7StringRealizationProofTests();
const phase7Pass = phase7.every((t) => t.ok);
const orbitDebussy = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlOrbit, 'debussy');
const orbitKenny = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlOrbit, 'kenny_wheeler');
const orbitProofPass =
  orbitDebussy.phase7?.melodyOwnershipEnforced === true &&
  orbitKenny.phase7?.melodyOwnershipEnforced === true;

const rows: Record<string, unknown>[] = [];
let hardFail = !phase7Pass || !orbitProofPass;

for (const composerId of COMPOSERS) {
  const handoff = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlMeta, composerId);
  const diag = handoff.guitarChording;
  const pitchKey = leadSheetOwnerMelodyPitchOrderKey(handoff.score, handoff.perBarMelodyOwnership);
  const rhythmKey = leadSheetGuitarMelodyRhythmKey(handoff.score);
  const beforeHandoff = applyLeadSheetGuitarChordingPass({
    score: structuredClone(handoff.score) as typeof handoff.score,
    appliedHarmonyBars: handoff.spine.appliedHarmonyBars,
    composerId,
    seed: SEED,
  });
  const melodyPin = pitchKey === leadSheetOwnerMelodyPitchOrderKey(beforeHandoff.score, handoff.perBarMelodyOwnership);
  const rhythmUnchanged = rhythmKey === leadSheetGuitarMelodyRhythmKey(beforeHandoff.score);

  const evalResult = runLeadSheetGceLockEval({
    score: handoff.score,
    composerId,
    seed: SEED,
    sourceFile: metaphysics,
  });
  const rhythmGate = evalResult.lock.gates.find((g) => g.gateId === 'rhythmAntiLoop');
  const lockPass = evalResult.lock.pass;
  const rhythmAntiLoopPass = rhythmGate?.status === 'pass';
  const sub16 = scanQuintetSubSixteenthNotes(handoff.score);
  const bars = maxBar(handoff.score);

  const exportResult = exportScoreModelToMusicXml(handoff.score);
  const exportPath = EXPORT_PATHS[composerId];
  if (!exportResult.success || !exportResult.xml) {
    console.error('Export failed', composerId, exportResult.errors);
    hardFail = true;
    continue;
  }
  fs.mkdirSync(path.dirname(exportPath), { recursive: true });
  fs.writeFileSync(exportPath, exportResult.xml, 'utf8');
  const exportBytes = fs.statSync(exportPath).size;

  const row = {
    composerId,
    chordBarsBefore: diag?.chordBarCountBefore ?? 0,
    chordBarsAfter: diag?.chordBarCountAfter ?? 0,
    eventsAdded: diag?.eventsAdded ?? 0,
    dyads: diag?.dyadCount ?? 0,
    triads: diag?.triadCount ?? 0,
    shells: diag?.shellCount ?? 0,
    feasibilityChecks: diag?.feasibilityChecks ?? 0,
    feasibilityPasses: diag?.feasibilityPasses ?? 0,
    feasibilitySkips: diag?.feasibilitySkips ?? 0,
    melodyPin,
    rhythmUnchanged,
    sub16: sub16.subSixteenthCount,
    bars,
    inputBars: tlMeta.bars,
    lockPass,
    rhythmAntiLoopPass,
    phase7Pass,
    orbitProofPass,
    meanV2Duration: meanDuration(handoff.score, composerId),
    exportPath,
    exportBytes,
  };
  rows.push(row);

  if (
    !melodyPin ||
    !rhythmUnchanged ||
    bars !== tlMeta.bars ||
    sub16.subSixteenthCount > 0 ||
    !lockPass ||
    !rhythmAntiLoopPass ||
    (diag?.eventsAdded ?? 0) === 0 ||
    exportBytes <= 0
  ) {
    hardFail = true;
  }
}

console.log('=== Phase D Guitar Chording Validation (seed 90106, Metaphysics 40-bar) ===');
for (const row of rows) {
  console.log(JSON.stringify(row));
}

const reportPath = path.join(__dirname, '..', 'output', 'phaseD_guitar_chording_validation_90106.json');
fs.writeFileSync(reportPath, JSON.stringify({ seed: SEED, rows, phase7Pass, orbitProofPass }, null, 2), 'utf8');
console.log('Wrote', reportPath);

process.exit(hardFail ? 1 : 0);