/**
 * Phase C validation + export for Kenny Wheeler Metaphysics 40-bar (seed 90106).
 * Run: npx tsx engines/composer-os-v2/scripts/runKennyWheelerPhaseCValidationCli.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { assembleDebussyLeadSheetQuintetWithHandoffScore } from '../core/import/assembleDebussyLeadSheetQuintetWithHandoffScore';
import { analyzeLeadSheetBartokContrastArc } from '../core/import/leadSheetBartokContrastArcPass';
import { analyzeLeadSheetDebussyContrastArc } from '../core/import/leadSheetDebussyContrastArcPass';
import { analyzeLeadSheetKennyWheelerContrastArc } from '../core/import/leadSheetKennyWheelerContrastArcPass';
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
  'metaphysics_40bar_90106_kenny_wheeler_phaseC.musicxml',
);

function maxBar(score: { parts: { measures: { index: number }[] }[] }): number {
  let m = 0;
  for (const p of score.parts) {
    for (const bar of p.measures) m = Math.max(m, bar.index);
  }
  return m;
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
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
const bartokMeta = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlMeta, 'bartok');
const kennyMeta = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlMeta, 'kenny_wheeler');

const melodyBefore = leadSheetOwnerMelodyPitchOrderKey(
  assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlMeta, 'kenny_wheeler').score,
  kennyMeta.perBarMelodyOwnership,
);
const melodyPinIntact = melodyBefore === leadSheetOwnerMelodyPitchOrderKey(kennyMeta.score, kennyMeta.perBarMelodyOwnership);

const evalKenny = runLeadSheetGceLockEval({
  score: kennyMeta.score,
  composerId: 'kenny_wheeler',
  seed: SEED,
  sourceFile: metaphysics,
});
const rhythmGate = evalKenny.lock.gates.find((g) => g.gateId === 'rhythmAntiLoop');
const lockPass = evalKenny.lock.pass;
const rhythmAntiLoopPass = rhythmGate?.status === 'pass';

const sub16 = scanQuintetSubSixteenthNotes(kennyMeta.score);
const kennyBars = analyzeLeadSheetKennyWheelerContrastArc(kennyMeta.score);
const bartokBars = analyzeLeadSheetBartokContrastArc(bartokMeta.score);
const debussyBars = analyzeLeadSheetDebussyContrastArc(debussyMeta.score);

const exportResult = exportScoreModelToMusicXml(kennyMeta.score);
if (!exportResult.success || !exportResult.xml) {
  console.error('Export failed', exportResult.errors);
  process.exit(1);
}
fs.mkdirSync(path.dirname(EXPORT_PATH), { recursive: true });
fs.writeFileSync(EXPORT_PATH, exportResult.xml, 'utf8');
const exportBytes = fs.statSync(EXPORT_PATH).size;
console.log('Wrote MusicXML:', EXPORT_PATH, '(' + exportBytes + ' bytes)');

const phase7 = runLeadSheetPhase7StringRealizationProofTests();
const phase7Pass = phase7.every((t) => t.ok);
const orbitDebussy = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlOrbit, 'debussy');
const orbitKenny = assembleDebussyLeadSheetQuintetWithHandoffScore(SEED, undefined, tlOrbit, 'kenny_wheeler');
const orbitProofPass =
  orbitDebussy.phase7?.melodyOwnershipEnforced === true &&
  orbitKenny.phase7?.melodyOwnershipEnforced === true;

const debussyUnchanged = debussyMeta.kennyWheelerContrastArc === undefined && debussyMeta.bartokContrastArc === undefined;
const bartokUnchanged = bartokMeta.kennyWheelerContrastArc === undefined && bartokMeta.bartokContrastArc !== undefined;

const kennyMeanVoice = mean(kennyBars.map((b) => b.activeVoiceCount));
const bartokMeanVoice = mean(bartokBars.map((b) => b.activeVoiceCount));
const debussyMeanVoice = mean(debussyBars.map((b) => b.activeVoiceCount));
const kennyMeanAttack = mean(kennyBars.map((b) => b.attackCount));
const bartokMeanAttack = mean(bartokBars.map((b) => b.attackCount));
const debussyMeanAttack = mean(debussyBars.map((b) => b.attackCount));
const betweenBartokDebussy = kennyMeanVoice > debussyMeanVoice && kennyMeanVoice < bartokMeanVoice &&
  kennyMeanAttack > debussyMeanAttack && kennyMeanAttack < bartokMeanAttack;

console.log('=== Kenny Wheeler Phase C Validation (seed 90106, Metaphysics 40-bar) ===');
console.log('activeVoiceCount:', kennyBars.map((b) => b.activeVoiceCount).join(','));
console.log('attackCount:', kennyBars.map((b) => b.attackCount).join(','));
console.log('guideToneRegion:', kennyMeta.kennyWheelerContrastArc?.guideToneRegion);
console.log('callResponseRegion:', kennyMeta.kennyWheelerContrastArc?.callResponseRegion);
console.log('breathRegion:', kennyMeta.kennyWheelerContrastArc?.breathRegion);
console.log('cadentialRegion:', kennyMeta.kennyWheelerContrastArc?.cadentialRegion);
console.log('mean active voices kenny/bartok/debussy:', kennyMeanVoice.toFixed(2), bartokMeanVoice.toFixed(2), debussyMeanVoice.toFixed(2));
console.log('mean attacks kenny/bartok/debussy:', kennyMeanAttack.toFixed(2), bartokMeanAttack.toFixed(2), debussyMeanAttack.toFixed(2));
console.log('activity between bartok and debussy:', betweenBartokDebussy);
console.log('melodyPinIntact:', melodyPinIntact);
console.log('bars:', maxBar(kennyMeta.score), '/', tlMeta.bars);
console.log('subSixteenthRemaining:', sub16.subSixteenthCount);
console.log('LOCK pass:', lockPass);
console.log('rhythmAntiLoop pass:', rhythmAntiLoopPass);
console.log('Phase7 proof green:', phase7Pass);
console.log('Orbit 8-bar proof green:', orbitProofPass);
console.log('debussy pass-through:', debussyUnchanged);
console.log('bartok pass-through:', bartokUnchanged);

const validation = {
  melodyPinIntact,
  bars: maxBar(kennyMeta.score),
  inputBars: tlMeta.bars,
  subSixteenthRemaining: sub16.subSixteenthCount,
  lockPass,
  rhythmAntiLoopPass,
  phase7Pass,
  orbitProofPass,
  debussyUnchanged,
  bartokUnchanged,
  betweenBartokDebussy,
  kennyMeanVoice,
  bartokMeanVoice,
  debussyMeanVoice,
  kennyMeanAttack,
  bartokMeanAttack,
  debussyMeanAttack,
  guideToneRegion: kennyMeta.kennyWheelerContrastArc?.guideToneRegion,
  callResponseRegion: kennyMeta.kennyWheelerContrastArc?.callResponseRegion,
  breathRegion: kennyMeta.kennyWheelerContrastArc?.breathRegion,
  cadentialRegion: kennyMeta.kennyWheelerContrastArc?.cadentialRegion,
  perBarActiveVoiceCount: kennyBars.map((b) => b.activeVoiceCount),
  perBarAttackCount: kennyBars.map((b) => b.attackCount),
  textureMap: kennyBars.map((b) => ({
    bar: b.bar,
    phase: b.macroPhase,
    state: b.textureState,
    guideTone: b.guideTonePresent,
    callResponse: b.callResponsePresent,
  })),
  exportPath: EXPORT_PATH,
  exportBytes,
};

const reportPath = path.join(__dirname, '..', 'output', 'kenny_wheeler_phaseC_validation_90106.json');
fs.writeFileSync(reportPath, JSON.stringify(validation, null, 2), 'utf8');
console.log('Wrote', reportPath);

const hardFail =
  !melodyPinIntact ||
  maxBar(kennyMeta.score) !== tlMeta.bars ||
  sub16.subSixteenthCount > 0 ||
  !lockPass ||
  !rhythmAntiLoopPass ||
  !phase7Pass ||
  !orbitProofPass ||
  !debussyUnchanged ||
  !bartokUnchanged ||
  exportBytes <= 0;

process.exit(hardFail ? 1 : 0);
