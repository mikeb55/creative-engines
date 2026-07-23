/**
 * Focused southern_rock -> jimmy_herring fidelity/GCE + regression slice.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import {
  RIFF_SOUTHERNROCK_MOTIF_SEED_ENV,
  RIFF_SOUTHERNROCK_MOTIF_SEED_VRB,
  pickPhraseForSeed,
  resetRiffPhraseMotifSeedCacheForTests,
  resolveRiffCoreMotif,
} from '../core/riff-generator/riffPhraseMotifSeed';
import { evaluateGce, defaultGceWeights, GCE_CATEGORY_ORDER } from '../core/evaluation/gceEvaluator';
import { extractScoreModelFeatures } from '../core/evaluation/featureExtractor';
import {
  scoreCadentialClarity,
  scoreMelodicIdentity,
  scoreStructureAndForm,
} from '../core/gce/gceAutoScorers';
import { buildFallbackChordsAndSectionsFromScore } from '../core/gce/gceGate';
import { evaluateFinalBarTensionGate } from '../core/gce/finalBarTensionGate';
import { scoreModelToMelodicLine } from '../core/gce/scoreModelToMelodicLine';
import { resolveMelodicPartId } from '../core/gce/resolveMelodicPartId';
import { isTonicFamilyChord } from '../scripts/eval/jamersonBassLensEvalCore';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import type { GceCategory } from '../core/evaluation/evaluationTypes';
import { runRiffPhraseMotifSeedExtendTests } from '../tests/riffPhraseMotifSeedExtend.test';

const SEEDS = (process.argv.slice(2).map((s) => Number(s)).filter((n) => Number.isFinite(n)) as number[]).length
  ? (process.argv.slice(2).map((s) => Number(s)).filter((n) => Number.isFinite(n)) as number[])
  : [62, 57, 36];
const CATEGORY = 'southern_rock' as const;
const VRB = RIFF_SOUTHERNROCK_MOTIF_SEED_VRB;
const ENV = RIFF_SOUTHERNROCK_MOTIF_SEED_ENV;
const REGRESSION_VRBS = [
  'weather_report',
  'nile_rodgers',
  'iommi',
  'mahavishnu',
  'fripp',
  'bill_evans_sax',
  'hendrix',
  'led_zeppelin',
  'morello',
  'david_gilmour',
  'frank_zappa',
  'eddie_van_halen',
  'jimmy_herring',
] as const;

function sha(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}
function xmlOf(score: ScoreModel): string {
  const exp = exportScoreModelToMusicXml(score);
  if (!exp.success || !exp.xml) throw new Error('xml fail');
  return exp.xml;
}
function clearFlags(): void {
  delete process.env[ENV];
  resetRiffPhraseMotifSeedCacheForTests();
}
function setFlag(on: boolean): void {
  clearFlags();
  if (on) process.env[ENV] = '1';
  resetRiffPhraseMotifSeedCacheForTests();
}
function build(seed: number, vrbId: string, title: string) {
  const style = 'metheny' as const;
  const profile = resolveRiffGeneratorProfile({
    vrbId,
    style,
    grid: 'sixteenth',
    density: 'dense',
  });
  return buildRiffScoreModel({
    seed,
    bars: 8,
    density: 'dense',
    style,
    grid: 'sixteenth',
    lineMode: 'single_line',
    bassEnabled: false,
    vrbId,
    chordSymbols: ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'Am7', 'D7', 'Gmaj7', 'Cmaj7'],
    bpm: 112,
    title,
    riffProfile: profile,
  });
}
function realizedIv(score: ScoreModel): number[] {
  const mel = scoreModelToMelodicLine(score, resolveMelodicPartId(score));
  const p = mel.filter((n) => !n.rest && n.midi > 0).map((n) => n.midi);
  const o: number[] = [];
  for (let i = 1; i < p.length; i++) o.push(p[i]! - p[i - 1]!);
  return o;
}
function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}
function exactRate(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let h = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) h++;
  return h / n;
}
function isDom(s: string): boolean {
  if (!s.trim() || isTonicFamilyChord(s)) return false;
  const q = s.toLowerCase();
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}
function hard(score: ScoreModel, styleId: string) {
  const { chords, sections } = buildFallbackChordsAndSectionsFromScore(score);
  const melody = scoreModelToMelodicLine(score, resolveMelodicPartId(score));
  const melodic = scoreMelodicIdentity(melody, styleId);
  const structure = scoreStructureAndForm(score, chords, sections);
  const cadence = scoreCadentialClarity(melody, chords, sections);
  const coverage = cadence.score / 10;
  const finalBar = chords.length;
  const chord = (chords[finalBar - 1] ?? '').trim();
  const partId = resolveMelodicPartId(score);
  const part = score.parts.find((p) => p.id === partId) ?? score.parts[0];
  const m = part?.measures.find((x) => x.index === finalBar);
  const short = (m?.events.filter((e) => e.kind === 'note').length ?? 0) <= 2;
  let tension = isDom(chord) ? 0.95 + (short ? 0.15 : 0) : isTonicFamilyChord(chord) ? 0.15 : 0.55;
  tension = Math.min(1, tension);
  const gates = [
    { id: 'melodicIdentity', pass: !(melodic.score <= 6 || melodic.justification.includes('[HARD FAIL]')) },
    { id: 'sectionContrast', pass: !structure.justification.includes('[HARD FAIL') },
    { id: 'cadentialClarityCoverage', pass: !(coverage < 0.4) },
    { id: 'finalBarTension', pass: evaluateFinalBarTensionGate({ score, chords, presetId: 'riff_generator' }).pass },
  ];
  return { gates, allPass: gates.every((g) => g.pass), coverage, tension };
}
function gce(score: ScoreModel, styleId: string) {
  const features = extractScoreModelFeatures(score);
  const r = evaluateGce({
    output: score,
    features,
    weights: defaultGceWeights,
    metadata: { songwriterStyleId: styleId },
  });
  const categories = {} as Record<GceCategory, number>;
  for (const c of GCE_CATEGORY_ORDER) categories[c] = r.categories[c].score;
  return { finalScore: r.finalScore, weakest: r.weakestCategory, categories };
}

const outDir = path.resolve(__dirname, '../../../output/riff-southernrock-motif-seed-poc');
fs.mkdirSync(outDir, { recursive: true });

console.log('======== southern_rock -> jimmy_herring ========');
console.log('| seed | phrase | iv | OFF gce | ON gce | hard | OFF cos | ON cos | ON exact |');
const rows: any[] = [];
for (const seed of SEEDS) {
  setFlag(false);
  const offBuilt = build(seed, VRB, VRB + ' OFF ' + seed);
  const offXml = xmlOf(offBuilt.score);
  const offG = gce(offBuilt.score, VRB);
  const offH = hard(offBuilt.score, VRB);
  const offRealized = realizedIv(offBuilt.score);

  setFlag(true);
  const phrase = pickPhraseForSeed(CATEGORY, seed)!;
  const onBuilt = build(seed, VRB, VRB + ' ON ' + seed);
  const onXml = xmlOf(onBuilt.score);
  const onG = gce(onBuilt.score, VRB);
  const onH = hard(onBuilt.score, VRB);
  const onMotif = resolveRiffCoreMotif(seed, VRB);
  const onRealized = realizedIv(onBuilt.score);
  const ip = phrase.intervalSequence;
  const offCos = cosine(offRealized, ip);
  const onCos = cosine(onRealized, ip);
  const onExact = exactRate(onRealized, ip);

  fs.writeFileSync(path.join(outDir, VRB + '_OFF_seed' + seed + '.musicxml'), offXml);
  fs.writeFileSync(path.join(outDir, VRB + '_ON_seed' + seed + '.musicxml'), onXml);

  console.log(
    '| ' + seed + ' | ' + phrase.id.replace(CATEGORY + '__', '').slice(0, 36) + ' | ' + ip.length + ' | ' + offG.finalScore + ' | ' + onG.finalScore + ' | OFF ' + (offH.allPass ? 'P' : 'F') + '/ON ' + (onH.allPass ? 'P' : 'F') + ' | ' + offCos.toFixed(3) + ' | ' + onCos.toFixed(3) + ' | ' + onExact.toFixed(3) + ' |'
  );
  rows.push({
    seed, phraseId: phrase.id, iv: ip.length, motifId: onMotif.id,
    offGce: offG.finalScore, onGce: onG.finalScore,
    hardOff: offH.allPass, hardOn: onH.allPass,
    offCos, onCos, onExact, xmlDiffer: sha(offXml) !== sha(onXml),
  });
}

console.log('\n======== regression ========');
clearFlags();
const baseline: Record<string, string> = {};
const seed = 424242;
for (const vrbId of REGRESSION_VRBS) {
  baseline[vrbId] = sha(xmlOf(build(seed, vrbId, 'reg').score));
}
setFlag(true);
let regOk = true;
for (const vrbId of REGRESSION_VRBS) {
  const h = sha(xmlOf(build(seed, vrbId, 'reg').score));
  const changed = h !== baseline[vrbId];
  const expect = vrbId === 'jimmy_herring';
  const ok = changed === expect;
  if (!ok) regOk = false;
  console.log(ok ? 'PASS' : 'FAIL', vrbId, changed ? 'CHANGED' : 'stable', 'expect', expect ? 'change' : 'stable');
}

console.log('\n======== unit ========');
const unit = runRiffPhraseMotifSeedExtendTests();
const unitFails = unit.filter((r) => !r.ok).length;
console.log('unit fails:', unitFails);

const report = { pairing: 'southern_rock -> jimmy_herring', rows, regressionOk: regOk, unitFails };
fs.writeFileSync(path.join(outDir, 'gce-fidelity-report.json'), JSON.stringify(report, null, 2));
console.log('\nWrote', path.join(outDir, 'gce-fidelity-report.json'));
clearFlags();
if (!regOk || unitFails > 0) process.exit(1);
const lowCos = rows.filter((r) => r.onCos < 0.5);
if (lowCos.length) {
  console.log('STOP: fidelity below 0.5');
  process.exit(1);
}


