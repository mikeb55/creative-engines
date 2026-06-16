/**
 * Phase B v2 validation + export for guitar melody 16th-grid displacement (seed 90106).
 * Run: npx tsx engines/composer-os-v2/scripts/runPhaseBGuitarMelodyMicroTimingValidationCli.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { assembleDebussyLeadSheetQuintetWithHandoffScore } from '../core/import/assembleDebussyLeadSheetQuintetWithHandoffScore';
import { leadSheetOwnerMelodyPitchOrderKey } from '../core/import/leadSheetIdentityCellEchoPass';
import { leadSheetGuitarMelodyRhythmKey } from '../core/import/leadSheetGuitarChordingPass';
import {
  countGuitarMelodyOnsetDiffVsBaseline,
  leadSheetGuitarMelodyBarAssignmentKey,
  leadSheetGuitarMelodyPitchOrderKey,
  leadSheetNonMelodyPartsFingerprint,
  listGuitarMelodyOnsetMovesVsBaseline,
} from '../core/import/leadSheetGuitarMelodyMicroTimingPass';
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

const PHASE_D_EXPORT: Record<(typeof COMPOSERS)[number], string> = {
  bartok: path.join(__dirname, '..', 'output', 'metaphysics_40bar_90106_bartok_phaseD.musicxml'),
  debussy: path.join(__dirname, '..', 'output', 'metaphysics_40bar_90106_debussy_phaseD.musicxml'),
  kenny_wheeler: path.join(
    __dirname,
    '..',
    'output',
    'metaphysics_40bar_90106_kenny_wheeler_phaseD.musicxml',
  ),
};

const PHASE_B_EXPORT: Record<(typeof COMPOSERS)[number], string> = {
  bartok: path.join(__dirname, '..', 'output', 'metaphysics_40bar_90106_bartok_phaseB.musicxml'),
  debussy: path.join(__dirname, '..', 'output', 'metaphysics_40bar_90106_debussy_phaseB.musicxml'),
  kenny_wheeler: path.join(
    __dirname,
    '..',
    'output',
    'metaphysics_40bar_90106_kenny_wheeler_phaseB.musicxml',
  ),
};

function maxBar(score: { parts: { measures: { index: number }[] }[] }): number {
  let m = 0;
  for (const p of score.parts) {
    for (const bar of p.measures) m = Math.max(m, bar.index);
  }
  return m;
}

function num(v: number | null | undefined): number {
  return v ?? 0;
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
  const phaseD = assembleDebussyLeadSheetQuintetWithHandoffScore(
    SEED,
    undefined,
    tlMeta,
    composerId,
    { skipGuitarMelodyMicroTiming: true },
  );
  const phaseB = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlMeta, composerId);

  const pitchOrderPhaseD = leadSheetGuitarMelodyPitchOrderKey(phaseD.score);
  const pitchOrderPhaseB = leadSheetGuitarMelodyPitchOrderKey(phaseB.score);
  const barAssignPhaseD = leadSheetGuitarMelodyBarAssignmentKey(phaseD.score);
  const barAssignPhaseB = leadSheetGuitarMelodyBarAssignmentKey(phaseB.score);
  const nonMelodyPhaseD = leadSheetNonMelodyPartsFingerprint(phaseD.score);
  const nonMelodyPhaseB = leadSheetNonMelodyPartsFingerprint(phaseB.score);
  const ownerPitchPhaseD = leadSheetOwnerMelodyPitchOrderKey(phaseD.score, phaseD.perBarMelodyOwnership);
  const ownerPitchPhaseB = leadSheetOwnerMelodyPitchOrderKey(phaseB.score, phaseB.perBarMelodyOwnership);

  const notesAdjustedPostClamp = countGuitarMelodyOnsetDiffVsBaseline(phaseD.score, phaseB.score);
  const onsetMoves = listGuitarMelodyOnsetMovesVsBaseline(phaseD.score, phaseB.score);
  const earlyCount = onsetMoves.filter((m) => m.direction === 'EARLY').length;
  const lateCount = onsetMoves.filter((m) => m.direction === 'LATE').length;
  const rhythmKeyPhaseD = leadSheetGuitarMelodyRhythmKey(phaseD.score);
  const rhythmKeyPhaseB = leadSheetGuitarMelodyRhythmKey(phaseB.score);
  const guitarV1RhythmChanged = rhythmKeyPhaseD !== rhythmKeyPhaseB;

  const evalPhaseD = runLeadSheetGceLockEval({
    score: phaseD.score,
    composerId,
    seed: SEED,
    sourceFile: metaphysics,
  });
  const evalPhaseB = runLeadSheetGceLockEval({
    score: phaseB.score,
    composerId,
    seed: SEED,
    sourceFile: metaphysics,
  });

  const rhythmicIdentityPhaseD = evalPhaseD.gce.categories.rhythmicIdentity;
  const rhythmicIdentityPhaseB = evalPhaseB.gce.categories.rhythmicIdentity;
  const rhythmicIdentityDelta = rhythmicIdentityPhaseB - rhythmicIdentityPhaseD;

  const swingGridPhaseD = num(evalPhaseD.featuresUsed.rhythmic?.swingGridAlignment);
  const swingGridPhaseB = num(evalPhaseB.featuresUsed.rhythmic?.swingGridAlignment);

  const rhythmGate = evalPhaseB.lock.gates.find((g) => g.gateId === 'rhythmAntiLoop');
  const lockPass = evalPhaseB.lock.pass;
  const rhythmAntiLoopPass = rhythmGate?.status === 'pass';
  const sub16 = scanQuintetSubSixteenthNotes(phaseB.score);
  const bars = maxBar(phaseB.score);

  const exportResult = exportScoreModelToMusicXml(phaseB.score);
  const exportPath = PHASE_B_EXPORT[composerId];
  if (!exportResult.success || !exportResult.xml) {
    console.error('Export failed', composerId, exportResult.errors);
    hardFail = true;
    continue;
  }
  fs.mkdirSync(path.dirname(exportPath), { recursive: true });
  fs.writeFileSync(exportPath, exportResult.xml, 'utf8');
  const exportBytes = fs.statSync(exportPath).size;

  const phaseDPath = PHASE_D_EXPORT[composerId];
  let phaseDBytes = 0;
  let exportDiffersFromPhaseD = false;
  if (fs.existsSync(phaseDPath)) {
    phaseDBytes = fs.statSync(phaseDPath).size;
    exportDiffersFromPhaseD = exportBytes !== phaseDBytes;
  } else {
    const phaseDExport = exportScoreModelToMusicXml(phaseD.score);
    if (phaseDExport.success && phaseDExport.xml) {
      fs.mkdirSync(path.dirname(phaseDPath), { recursive: true });
      fs.writeFileSync(phaseDPath, phaseDExport.xml, 'utf8');
      phaseDBytes = fs.statSync(phaseDPath).size;
      exportDiffersFromPhaseD = exportBytes !== phaseDBytes;
    }
  }

  const row = {
    composerId,
    targetVoice: 'guitar-v1',
    notesAdjustedPreClamp: phaseB.guitarMelodyMicroTiming?.notesAdjusted ?? 0,
    notesAdjustedPostClamp,
    earlyCount,
    lateCount,
    onsetMoves: composerId === 'bartok' ? onsetMoves : undefined,
    notesSkippedCollision: phaseB.guitarMelodyMicroTiming?.notesSkippedCollision ?? 0,
    barsTouched: phaseB.guitarMelodyMicroTiming?.barsTouched ?? 0,
    displacementDensity: phaseB.guitarMelodyMicroTiming?.displacementDensity ?? 0,
    pitchOrderUnchanged: pitchOrderPhaseD === pitchOrderPhaseB,
    ownerPitchUnchanged: ownerPitchPhaseD === ownerPitchPhaseB,
    barAssignmentUnchanged: barAssignPhaseD === barAssignPhaseB,
    nonMelodyFingerprintUnchanged: nonMelodyPhaseD === nonMelodyPhaseB,
    guitarV1RhythmChanged,
    rhythmicIdentityPhaseD,
    rhythmicIdentityPhaseB,
    rhythmicIdentityDelta,
    swingGridPhaseD,
    swingGridPhaseB,
    sub16: sub16.subSixteenthCount,
    bars,
    inputBars: tlMeta.bars,
    lockPass,
    rhythmAntiLoopPass,
    phase7Pass,
    orbitProofPass,
    exportPath,
    exportBytes,
    phaseDBytes,
    exportDiffersFromPhaseD,
  };
  rows.push(row);

  if (
    !row.pitchOrderUnchanged ||
    !row.ownerPitchUnchanged ||
    !row.barAssignmentUnchanged ||
    !row.nonMelodyFingerprintUnchanged ||
    notesAdjustedPostClamp <= 0 ||
    !guitarV1RhythmChanged ||
    !exportDiffersFromPhaseD ||
    exportBytes <= 0 ||
    bars !== tlMeta.bars ||
    sub16.subSixteenthCount > 0 ||
    !lockPass ||
    !rhythmAntiLoopPass ||
    swingGridPhaseB <= 0.65 ||
    rhythmicIdentityDelta <= 0 ||
    (composerId === 'bartok' && (earlyCount === 0 || earlyCount <= lateCount || lateCount === 0))
  ) {
    hardFail = true;
  }
}

console.log('=== Phase B v2 Guitar Melody 16th Displacement (seed 90106, Metaphysics 40-bar) ===');
console.log(
  'composer | postClamp | early | late | rId D→B | swingB | pitch | bar | v2 | xmlDiff | rhythmGate | sub16',
);
for (const row of rows) {
  console.log(
    [
      row.composerId,
      row.notesAdjustedPostClamp,
      row.earlyCount,
      row.lateCount,
      `${row.rhythmicIdentityPhaseD}→${row.rhythmicIdentityPhaseB} (${row.rhythmicIdentityDelta >= 0 ? '+' : ''}${row.rhythmicIdentityDelta})`,
      row.swingGridPhaseB,
      row.pitchOrderUnchanged ? 'ok' : 'FAIL',
      row.barAssignmentUnchanged ? 'ok' : 'FAIL',
      row.nonMelodyFingerprintUnchanged ? 'ok' : 'FAIL',
      row.exportDiffersFromPhaseD ? 'yes' : 'FAIL',
      row.rhythmAntiLoopPass ? 'pass' : 'FAIL',
      row.sub16,
    ].join(' | '),
  );
}

const bartokRow = rows.find((r) => r.composerId === 'bartok');
if (bartokRow && Array.isArray(bartokRow.onsetMoves)) {
  console.log('\n=== Bartók displaced onsets (post-clamp vs Phase D) ===');
  for (const move of bartokRow.onsetMoves as Array<{
    bar: number;
    oldOnset: number;
    newOnset: number;
    direction: string;
  }>) {
    console.log(
      `bar ${move.bar}: ${move.oldOnset.toFixed(2)} → ${move.newOnset.toFixed(2)} (${move.direction})`,
    );
  }
}

const reportPath = path.join(__dirname, '..', 'output', 'phaseB_guitar_melody_micro_timing_validation_90106.json');
fs.writeFileSync(reportPath, JSON.stringify({ seed: SEED, rows, phase7Pass, orbitProofPass }, null, 2), 'utf8');
console.log('Wrote', reportPath);

process.exit(hardFail ? 1 : 0);
