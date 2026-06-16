/**
 * Phase C validation + export for Bartok Metaphysics 40-bar (seed 90106).
 * Run: npx tsx engines/composer-os-v2/scripts/runBartokPhaseCValidationCli.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { assembleDebussyLeadSheetQuintetWithHandoffScore } from '../core/import/assembleDebussyLeadSheetQuintetWithHandoffScore';
import {
  applyLeadSheetAccompanimentRhythmAntiLoopPass,
} from '../core/import/leadSheetAccompanimentRhythmAntiLoopPass';
import {
  applyLeadSheetIdentityCellEchoPass,
} from '../core/import/leadSheetIdentityCellEchoPass';
import { applyLeadSheetPhase7StringRealization } from '../core/import/leadSheetStringRealizationPass';
import { assembleDebussyLeadSheetQuintetScore } from '../core/import/assembleDebussyLeadSheetQuintetScore';
import { applyDebussyLeadSheetMelodyHandoff } from '../core/import/applyDebussyLeadSheetMelodyHandoff';
import { buildLeadSheetMelodyHandoffPlan } from '../core/import/debussyLeadSheetMelodyHandoffPlan';
import { analyzeLeadSheetBartokContrastArc } from '../core/import/leadSheetBartokContrastArcPass';
import { leadSheetOwnerMelodyPitchOrderKey } from '../core/import/leadSheetIdentityCellEchoPass';
import { runLeadSheetGceLockEval } from '../core/import/leadSheetGceLockEvalRunner';
import { loadDebussyLeadSheetImportTimelineFromMusicXmlFile } from '../core/import/loadDebussyLeadSheetImportTimelineFromMusicXmlFile';
import {
  resolveMetaphysicsLeadSheetProofPath,
  resolveOrbitLeadSheetProofPath,
} from '../core/import/resolveOrbitLeadSheetProofPath';
import { scanQuintetSubSixteenthNotes } from '../core/import/leadSheetQuintetSixteenthGridClampPass';
import { runLeadSheetPhase7StringRealizationProofTests } from '../tests/leadSheetPhase7StringRealizationProof.test';

const SEED = 90106;
const EXPORT_PATH = path.join(
  __dirname,
  '..',
  'output',
  'metaphysics_40bar_90106_bartok_phaseC.musicxml',
);

function maxBar(score: { parts: { measures: { index: number }[] }[] }): number {
  let m = 0;
  for (const p of score.parts) {
    for (const bar of p.measures) m = Math.max(m, bar.index);
  }
  return m;
}

function buildPreContrastBartokScore(tl: ReturnType<typeof loadDebussyLeadSheetImportTimelineFromMusicXmlFile>) {
  const base = assembleDebussyLeadSheetQuintetScore(SEED, tl, 'bartok');
  const plan = buildLeadSheetMelodyHandoffPlan(base.spine.appliedHarmonyBars.length);
  const handoff = applyDebussyLeadSheetMelodyHandoff(base, plan, SEED);
  const phase7 = applyLeadSheetPhase7StringRealization({
    score: handoff.score,
    melody: handoff.spine.importTimeline.melodyLine,
    appliedHarmonyBars: handoff.spine.appliedHarmonyBars,
    perBarMelodyOwnership: handoff.perBarMelodyOwnership,
    seed: SEED,
  });
  const rhythmAntiLoop = applyLeadSheetAccompanimentRhythmAntiLoopPass({
    score: phase7.score,
    perBarMelodyOwnership: handoff.perBarMelodyOwnership,
    seed: SEED,
    composerId: 'bartok',
  });
  const identityCellEcho = applyLeadSheetIdentityCellEchoPass({
    score: rhythmAntiLoop.score,
    melodyLine: handoff.spine.importTimeline.melodyLine,
    perBarMelodyOwnership: handoff.perBarMelodyOwnership,
    appliedHarmonyBars: handoff.spine.appliedHarmonyBars,
    seed: SEED,
  });
  return { handoff, score: identityCellEcho.score };
}

function scoreFingerprint(score: ReturnType<typeof assembleDebussyLeadSheetQuintetWithHandoffScore>['score']): string {
  const chunks: string[] = [];
  for (const part of score.parts) {
    for (const measure of part.measures) {
      const notes = measure.events
        .filter((e) => e.kind === 'note')
        .map((e) => `${e.pitch}@${e.startBeat}x${e.duration}`)
        .sort();
      chunks.push(`${part.id}:${measure.index}:${notes.join(',')}`);
    }
  }
  return chunks.join('|');
}

const metaphysics = resolveMetaphysicsLeadSheetProofPath(path.join(__dirname, '..'));
const orbit = resolveOrbitLeadSheetProofPath(path.join(__dirname, '..'));
if (!metaphysics || !orbit) {
  console.error('Fixtures missing');
  process.exit(1);
}

const tlMeta = loadDebussyLeadSheetImportTimelineFromMusicXmlFile(metaphysics);
const tlOrbit = loadDebussyLeadSheetImportTimelineFromMusicXmlFile(orbit);

const debussyMeta = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlMeta, 'debussy');
const kennyMeta = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlMeta, 'kenny_wheeler');
const bartokMeta = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlMeta, 'bartok');

const preContrast = buildPreContrastBartokScore(tlMeta);
const melodyBefore = leadSheetOwnerMelodyPitchOrderKey(preContrast.score, preContrast.handoff.perBarMelodyOwnership);
const melodyAfter = leadSheetOwnerMelodyPitchOrderKey(bartokMeta.score, bartokMeta.perBarMelodyOwnership);
const melodyPinIntact = melodyBefore === melodyAfter;

const evalBartok = runLeadSheetGceLockEval({
  score: bartokMeta.score,
  composerId: 'bartok',
  seed: SEED,
  sourceFile: metaphysics,
});
const rhythmGate = evalBartok.lock.gates.find((g) => g.gateId === 'rhythmAntiLoop');
const lockPass = evalBartok.lock.pass;
const rhythmAntiLoopPass = rhythmGate?.status === 'pass';

const sub16 = scanQuintetSubSixteenthNotes(bartokMeta.score);
const bars = analyzeLeadSheetBartokContrastArc(bartokMeta.score);

const exportResult = exportScoreModelToMusicXml(bartokMeta.score);
if (!exportResult.success || !exportResult.xml) {
  console.error('Export failed', exportResult.errors);
  process.exit(1);
}
const MUSICXML_PATHS = [
  EXPORT_PATH,
  path.join(__dirname, '..', 'output', 'bartok_phaseC_validation_90106.musicxml'),
];
for (const xmlPath of MUSICXML_PATHS) {
  fs.mkdirSync(path.dirname(xmlPath), { recursive: true });
  fs.writeFileSync(xmlPath, exportResult.xml, 'utf8');
  console.log('Wrote MusicXML:', xmlPath, '(' + exportResult.xml.length + ' bytes)');
}

const phase7 = runLeadSheetPhase7StringRealizationProofTests();
const phase7Pass = phase7.every((t) => t.ok);
const orbitDebussy = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlOrbit, 'debussy');
const orbitKenny = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlOrbit, 'kenny_wheeler');
const orbitProofPass =
  orbitDebussy.phase7?.melodyOwnershipEnforced === true &&
  orbitKenny.phase7?.melodyOwnershipEnforced === true;

const debussyFp = scoreFingerprint(debussyMeta.score);
const kennyFp = scoreFingerprint(kennyMeta.score);
const debussyUnchanged = debussyMeta.bartokContrastArc === undefined;
const kennyUnchanged = kennyMeta.bartokContrastArc === undefined;

console.log('=== Bartok Phase C Validation (seed 90106, Metaphysics 40-bar) ===');
console.log('activeVoiceCount:', bars.map((b) => b.activeVoiceCount).join(','));
console.log('attackCount:', bars.map((b) => b.attackCount).join(','));
console.log('sparseRegion:', bartokMeta.bartokContrastArc?.sparseRegion);
console.log('denseRegion:', bartokMeta.bartokContrastArc?.denseRegion);
console.log('fractureRegion:', bartokMeta.bartokContrastArc?.fractureRegion);
console.log('aksakPresent:', bartokMeta.bartokContrastArc?.aksakPresent);
console.log('melodyPinIntact:', melodyPinIntact);
console.log('bars:', maxBar(bartokMeta.score), '/', tlMeta.bars);
console.log('subSixteenthRemaining:', sub16.subSixteenthCount);
console.log('LOCK pass:', lockPass);
console.log('rhythmAntiLoop pass:', rhythmAntiLoopPass);
console.log('Phase7 proof green:', phase7Pass);
console.log('Orbit 8-bar proof green:', orbitProofPass);
console.log('debussy pass-through (no contrastArc):', debussyUnchanged);
console.log('kenny pass-through (no contrastArc):', kennyUnchanged);
console.log('debussy vs bartok fingerprint differ:', debussyFp !== scoreFingerprint(bartokMeta.score));
console.log('export:', EXPORT_PATH);

const validation = {
  melodyPinIntact,
  bars: maxBar(bartokMeta.score),
  inputBars: tlMeta.bars,
  subSixteenthRemaining: sub16.subSixteenthCount,
  lockPass,
  rhythmAntiLoopPass,
  phase7Pass,
  orbitProofPass,
  debussyUnchanged,
  kennyUnchanged,
  sparseRegion: bartokMeta.bartokContrastArc?.sparseRegion,
  denseRegion: bartokMeta.bartokContrastArc?.denseRegion,
  fractureRegion: bartokMeta.bartokContrastArc?.fractureRegion,
  aksakPresent: bartokMeta.bartokContrastArc?.aksakPresent,
  perBarActiveVoiceCount: bars.map((b) => b.activeVoiceCount),
  perBarAttackCount: bars.map((b) => b.attackCount),
  textureMap: bars.map((b) => ({ bar: b.bar, phase: b.macroPhase, state: b.textureState })),
};

const reportPath = path.join(__dirname, '..', 'output', 'bartok_phaseC_validation_90106.json');
fs.writeFileSync(reportPath, JSON.stringify(validation, null, 2), 'utf8');
console.log('Wrote', reportPath);

const hardFail =
  !melodyPinIntact ||
  maxBar(bartokMeta.score) !== tlMeta.bars ||
  sub16.subSixteenthCount > 0 ||
  !lockPass ||
  !rhythmAntiLoopPass ||
  !debussyUnchanged ||
  !kennyUnchanged;

process.exit(hardFail ? 1 : 0);
