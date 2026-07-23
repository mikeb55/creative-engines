/**
 * Export ON/OFF MusicXML + fidelity/GCE compare for phrase motif-seed extend:
 *   jazz_rock → mahavishnu (COMPOSER_OS_RIFF_JAZZROCK_MOTIF_SEED)
 *   diminished_lines → fripp (COMPOSER_OS_RIFF_DIM_MOTIF_SEED)
 *
 * Seeds prefer phrases with ≥10 intervals (skip degenerate short phrases).
 *
 *   npx tsx --tsconfig ../../tsconfig.json scripts/compareRiffPhraseMotifSeedExtend.ts
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import {
  RIFF_DIM_MOTIF_SEED_ENV,
  RIFF_DIM_MOTIF_SEED_VRB,
  RIFF_WHITEROCK_MOTIF_SEED_ENV,
  RIFF_WHITEROCK_MOTIF_SEED_VRB,
  RIFF_BLACKSOUL_MOTIF_SEED_ENV,
  RIFF_BLACKSOUL_MOTIF_SEED_VRB,
  RIFF_BEBOP_MOTIF_SEED_ENV,
  RIFF_BEBOP_MOTIF_SEED_VRB,
  RIFF_BLUESROCK_MOTIF_SEED_ENV,
  RIFF_BLUESROCK_MOTIF_SEED_VRB,
  RIFF_SOUTHERNROCK_MOTIF_SEED_ENV,
  RIFF_SOUTHERNROCK_MOTIF_SEED_VRB,
  RIFF_MODERNROCK_MOTIF_SEED_ENV,
  RIFF_MODERNROCK_MOTIF_SEED_VRB,
  RIFF_JAZZROCK_MOTIF_SEED_ENV,
  RIFF_JAZZROCK_MOTIF_SEED_VRB,
  findSeedsWithMinPhraseIntervals,
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
import { scoreModelToMelodicLine } from '../core/gce/scoreModelToMelodicLine';
import { resolveMelodicPartId } from '../core/gce/resolveMelodicPartId';
import { isTonicFamilyChord } from '../scripts/eval/jamersonBassLensEvalCore';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import type { GceCategory } from '../core/evaluation/evaluationTypes';
import type { RiffPhraseCategory } from '../core/riff-generator/riffPhraseLibraryTypes';
import { runRiffPhraseMotifSeedExtendTests } from '../tests/riffPhraseMotifSeedExtend.test';
import { runRiffSaxMotifSeedPocTests } from '../tests/riffSaxMotifSeedPoc.test';
import { runRiffMotifFidelityPhase19Tests } from '../tests/riffMotifFidelityPhase19.test';

type PairingCfg = {
  label: string;
  env: string;
  vrbId: string;
  category: RiffPhraseCategory;
  outDirName: string;
  seeds: number[];
};

const PAIRINGS: PairingCfg[] = [
  {
    label: 'jazz_rock → mahavishnu',
    env: RIFF_JAZZROCK_MOTIF_SEED_ENV,
    vrbId: RIFF_JAZZROCK_MOTIF_SEED_VRB,
    category: 'jazz_rock',
    outDirName: 'riff-jazzrock-motif-seed-poc',
    // Distinct ≥10-iv phrases (all jazz_rock are ≥10)
    seeds: [424242, 777001, 2],
  },
  {
    label: 'diminished_lines → fripp',
    env: RIFF_DIM_MOTIF_SEED_ENV,
    vrbId: RIFF_DIM_MOTIF_SEED_VRB,
    category: 'diminished_lines',
    outDirName: 'riff-dim-motif-seed-poc',
    // Verified ≥10 iv (skip 0-iv degenerates like 424243)
    seeds: [424242, 777001, 90210],
  },
  {
    label: 'white_rock_funk → iommi',
    env: RIFF_WHITEROCK_MOTIF_SEED_ENV,
    vrbId: RIFF_WHITEROCK_MOTIF_SEED_VRB,
    category: 'white_rock_funk',
    outDirName: 'riff-whiterock-motif-seed-poc',
    seeds: [1, 2, 5],
  },
  {
    label: 'black_soul_funk → nile_rodgers',
    env: RIFF_BLACKSOUL_MOTIF_SEED_ENV,
    vrbId: RIFF_BLACKSOUL_MOTIF_SEED_VRB,
    category: 'black_soul_funk',
    outDirName: 'riff-blacksoul-motif-seed-poc',
    seeds: [8, 9, 10],
  },
  {
    label: 'bebop_jazz_blues → bill_evans_sax',
    env: RIFF_BEBOP_MOTIF_SEED_ENV,
    vrbId: RIFF_BEBOP_MOTIF_SEED_VRB,
    category: 'bebop_jazz_blues',
    outDirName: 'riff-bebop-motif-seed-poc',
    seeds: [1, 2, 3],
  },
  {
    label: 'blues_rock → hendrix',
    env: RIFF_BLUESROCK_MOTIF_SEED_ENV,
    vrbId: RIFF_BLUESROCK_MOTIF_SEED_VRB,
    category: 'blues_rock',
    outDirName: 'riff-bluesrock-motif-seed-poc',
    // Distinct ≥10-iv phrases (seed 1 = 0-iv leftover — skip)
    seeds: [2, 3, 4],
  },
  {
    label: 'southern_rock → led_zeppelin',
    env: RIFF_SOUTHERNROCK_MOTIF_SEED_ENV,
    vrbId: RIFF_SOUTHERNROCK_MOTIF_SEED_VRB,
    category: 'southern_rock',
    outDirName: 'riff-southernrock-motif-seed-poc',
    seeds: [1, 2, 3],
  },
  {
    label: 'modern_rock → morello',
    env: RIFF_MODERNROCK_MOTIF_SEED_ENV,
    vrbId: RIFF_MODERNROCK_MOTIF_SEED_VRB,
    category: 'modern_rock',
    outDirName: 'riff-modernrock-motif-seed-poc',
    seeds: [1, 2, 3],
  },
];

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
  delete process.env[RIFF_JAZZROCK_MOTIF_SEED_ENV];
  delete process.env[RIFF_DIM_MOTIF_SEED_ENV];
  delete process.env[RIFF_WHITEROCK_MOTIF_SEED_ENV];
  delete process.env[RIFF_BLACKSOUL_MOTIF_SEED_ENV];
  delete process.env[RIFF_BEBOP_MOTIF_SEED_ENV];
  delete process.env[RIFF_BLUESROCK_MOTIF_SEED_ENV];
  delete process.env[RIFF_SOUTHERNROCK_MOTIF_SEED_ENV];
  delete process.env[RIFF_MODERNROCK_MOTIF_SEED_ENV];
  resetRiffPhraseMotifSeedCacheForTests();
}
function setFlag(env: string, on: boolean): void {
  clearFlags();
  if (on) process.env[env] = '1';
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
  let dot = 0,
    na = 0,
    nb = 0;
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
    { id: 'finalBarTension', pass: !(tension > 0.7) },
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
  return {
    finalScore: r.finalScore,
    weakest: r.weakestCategory,
    categories,
  };
}

function runPairing(cfg: PairingCfg): Record<string, unknown> {
  const outDir = path.resolve(__dirname, '../../../output', cfg.outDirName);
  fs.mkdirSync(outDir, { recursive: true });

  // Validate seeds have ≥10 iv
  const seeds = cfg.seeds.filter((s) => {
    const p = pickPhraseForSeed(cfg.category, s);
    return !!p && p.intervalSequence.length >= 10;
  });
  if (seeds.length < 2) {
    const fallback = findSeedsWithMinPhraseIntervals(cfg.category, 3, 10, 1000);
    seeds.push(...fallback.filter((s) => !seeds.includes(s)).slice(0, 3 - seeds.length));
  }

  console.log('\n========', cfg.label, '========');
  console.log('| seed | phrase | iv | OFF gce | ON gce | hard | OFF cos | ON cos | ON exact | OFF sha16 |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');

  const rows: unknown[] = [];
  const readme: string[] = [
    cfg.label,
    'Flag: ' + cfg.env + ' (default OFF)',
    'VRB: ' + cfg.vrbId + ' ← category ' + cfg.category,
    'Min phrase intervals for examples: ≥10',
    '',
  ];

  // Flag-off self-parity
  setFlag(cfg.env, false);
  const paritySeed = seeds[0]!;
  const offA = xmlOf(build(paritySeed, cfg.vrbId, cfg.vrbId + ' OFF ' + paritySeed).score);
  const offB = xmlOf(build(paritySeed, cfg.vrbId, cfg.vrbId + ' OFF ' + paritySeed).score);
  const parityOk = sha(offA) === sha(offB);
  readme.push(
    'flag-off self-parity seed ' + paritySeed + ': ' + (parityOk ? 'PASS' : 'FAIL') + ' ' + sha(offA).slice(0, 16)
  );

  for (const seed of seeds) {
    setFlag(cfg.env, false);
    const offBuilt = build(seed, cfg.vrbId, cfg.vrbId + ' OFF ' + seed);
    const offXml = xmlOf(offBuilt.score);
    const offG = gce(offBuilt.score, cfg.vrbId);
    const offH = hard(offBuilt.score, cfg.vrbId);
    const offRealized = realizedIv(offBuilt.score);

    setFlag(cfg.env, true);
    const phrase = pickPhraseForSeed(cfg.category, seed)!;
    const onBuilt = build(seed, cfg.vrbId, cfg.vrbId + ' ON ' + seed);
    const onXml = xmlOf(onBuilt.score);
    const onG = gce(onBuilt.score, cfg.vrbId);
    const onH = hard(onBuilt.score, cfg.vrbId);
    const onMotif = resolveRiffCoreMotif(seed, cfg.vrbId);
    const onRealized = realizedIv(onBuilt.score);
    const ip = phrase.intervalSequence;

    const offCos = cosine(offRealized, ip);
    const onCos = cosine(onRealized, ip);
    const onExact = exactRate(onRealized, ip);
    const offExact = exactRate(offRealized, ip);

    const offPath = path.join(outDir, cfg.vrbId + '_OFF_seed' + seed + '.musicxml');
    const onPath = path.join(outDir, cfg.vrbId + '_ON_seed' + seed + '.musicxml');
    fs.writeFileSync(offPath, offXml);
    fs.writeFileSync(onPath, onXml);

    const offSha16 = sha(offXml).slice(0, 16);
    console.log(
      `| ${seed} | ${phrase.id.replace(cfg.category + '__', '').slice(0, 32)} | ${ip.length} | ${offG.finalScore} | ${onG.finalScore} | OFF ${offH.allPass ? 'P' : 'F'}/ON ${onH.allPass ? 'P' : 'F'} | ${offCos.toFixed(3)} | ${onCos.toFixed(3)} | ${onExact.toFixed(3)} | ${offSha16} |`
    );

    readme.push(
      [
        'seed=' + seed,
        'phrase=' + phrase.id,
        'iv=' + ip.length,
        'OFF motif=riff_core',
        'ON motif=' + onMotif.id,
        'xmlDiffer=' + (sha(offXml) !== sha(onXml)),
        'fidelity OFF cos=' + offCos.toFixed(3) + ' exact=' + offExact.toFixed(3),
        'fidelity ON cos=' + onCos.toFixed(3) + ' exact=' + onExact.toFixed(3),
        'files:',
        path.basename(offPath),
        path.basename(onPath),
      ].join(' | ')
    );

    rows.push({
      seed,
      phraseId: phrase.id,
      phraseIntervals: ip.length,
      motifId: onMotif.id,
      off: {
        gce: offG,
        hard: offH,
        xmlSha16: offSha16,
        fidelity: { cosine: +offCos.toFixed(4), exactRate: +offExact.toFixed(4) },
      },
      on: {
        gce: onG,
        hard: onH,
        xmlSha16: sha(onXml).slice(0, 16),
        fidelity: { cosine: +onCos.toFixed(4), exactRate: +onExact.toFixed(4) },
      },
    });
  }

  // Re-check flag-off parity against first written OFF file (stable hash)
  setFlag(cfg.env, false);
  const reOff = xmlOf(build(paritySeed, cfg.vrbId, cfg.vrbId + ' OFF ' + paritySeed).score);
  const offStable = sha(reOff).slice(0, 16) === sha(offA).slice(0, 16);

  fs.writeFileSync(path.join(outDir, 'README.txt'), readme.join('\n') + '\n', 'utf8');

  return {
    pairing: cfg.label,
    env: cfg.env,
    vrbId: cfg.vrbId,
    category: cfg.category,
    flagOffSelfParity: parityOk,
    flagOffHashStable: offStable,
    offParitySha16: sha(offA).slice(0, 16),
    seeds,
    pairs: rows,
    outDir,
  };
}

function regressionCheck(): { ok: boolean; detail: string }[] {
  const out: { ok: boolean; detail: string }[] = [];
  const seed = 424242;
  clearFlags();

  // Baseline hashes with all flags OFF
  const baseline: Record<string, string> = {};
  for (const vrbId of REGRESSION_VRBS) {
    baseline[vrbId] = sha(xmlOf(build(seed, vrbId, 'reg').score));
  }

  // Jazzrock flag ON — only mahavishnu may change
  setFlag(RIFF_JAZZROCK_MOTIF_SEED_ENV, true);
  for (const vrbId of REGRESSION_VRBS) {
    const h = sha(xmlOf(build(seed, vrbId, 'reg').score));
    const changed = h !== baseline[vrbId];
    const expectChange = vrbId === 'mahavishnu';
    out.push({
      ok: changed === expectChange,
      detail: `jazzrock flag: ${vrbId} ${changed ? 'CHANGED' : 'stable'} (expect ${expectChange ? 'change' : 'stable'})`,
    });
  }

  // Dim flag ON — only fripp may change
  setFlag(RIFF_DIM_MOTIF_SEED_ENV, true);
  for (const vrbId of REGRESSION_VRBS) {
    const h = sha(xmlOf(build(seed, vrbId, 'reg').score));
    const changed = h !== baseline[vrbId];
    const expectChange = vrbId === 'fripp';
    out.push({
      ok: changed === expectChange,
      detail: `dim flag: ${vrbId} ${changed ? 'CHANGED' : 'stable'} (expect ${expectChange ? 'change' : 'stable'})`,
    });
  }


  // Whiterock flag ON — only iommi may change
  setFlag(RIFF_WHITEROCK_MOTIF_SEED_ENV, true);
  for (const vrbId of REGRESSION_VRBS) {
    const h = sha(xmlOf(build(seed, vrbId, 'reg').score));
    const changed = h !== baseline[vrbId];
    const expectChange = vrbId === 'iommi';
    out.push({
      ok: changed === expectChange,
      detail: `whiterock flag: ${vrbId} ${changed ? 'CHANGED' : 'stable'} (expect ${expectChange ? 'change' : 'stable'})`,
    });
  }

  // Blacksoul flag ON — only nile_rodgers may change
  setFlag(RIFF_BLACKSOUL_MOTIF_SEED_ENV, true);
  for (const vrbId of REGRESSION_VRBS) {
    const h = sha(xmlOf(build(seed, vrbId, 'reg').score));
    const changed = h !== baseline[vrbId];
    const expectChange = vrbId === 'nile_rodgers';
    out.push({
      ok: changed === expectChange,
      detail: `blacksoul flag: ${vrbId} ${changed ? 'CHANGED' : 'stable'} (expect ${expectChange ? 'change' : 'stable'})`,
    });
  }

  // Bebop flag ON — only bill_evans_sax may change
  setFlag(RIFF_BEBOP_MOTIF_SEED_ENV, true);
  for (const vrbId of REGRESSION_VRBS) {
    const h = sha(xmlOf(build(seed, vrbId, 'reg').score));
    const changed = h !== baseline[vrbId];
    const expectChange = vrbId === 'bill_evans_sax';
    out.push({
      ok: changed === expectChange,
      detail: `bebop flag: ${vrbId} ${changed ? 'CHANGED' : 'stable'} (expect ${expectChange ? 'change' : 'stable'})`,
    });
  }

  // Bluesrock flag ON — only hendrix may change
  setFlag(RIFF_BLUESROCK_MOTIF_SEED_ENV, true);
  for (const vrbId of REGRESSION_VRBS) {
    const h = sha(xmlOf(build(seed, vrbId, 'reg').score));
    const changed = h !== baseline[vrbId];
    const expectChange = vrbId === 'hendrix';
    out.push({
      ok: changed === expectChange,
      detail: `bluesrock flag: ${vrbId} ${changed ? 'CHANGED' : 'stable'} (expect ${expectChange ? 'change' : 'stable'})`,
    });
  }

  // Southernrock flag ON — only led_zeppelin may change
  setFlag(RIFF_SOUTHERNROCK_MOTIF_SEED_ENV, true);
  for (const vrbId of REGRESSION_VRBS) {
    const h = sha(xmlOf(build(seed, vrbId, 'reg').score));
    const changed = h !== baseline[vrbId];
    const expectChange = vrbId === 'led_zeppelin';
    out.push({
      ok: changed === expectChange,
      detail: `southernrock flag: ${vrbId} ${changed ? 'CHANGED' : 'stable'} (expect ${expectChange ? 'change' : 'stable'})`,
    });
  }

  // Modernrock flag ON — only morello may change
  setFlag(RIFF_MODERNROCK_MOTIF_SEED_ENV, true);
  for (const vrbId of REGRESSION_VRBS) {
    const h = sha(xmlOf(build(seed, vrbId, 'reg').score));
    const changed = h !== baseline[vrbId];
    const expectChange = vrbId === 'morello';
    out.push({
      ok: changed === expectChange,
      detail: `modernrock flag: ${vrbId} ${changed ? 'CHANGED' : 'stable'} (expect ${expectChange ? 'change' : 'stable'})`,
    });
  }
  clearFlags();
  return out;
}

function main(): void {
  clearFlags();
  const reports = PAIRINGS.map(runPairing);
  console.log('\n======== regression (other VRBs) ========');
  const reg = regressionCheck();
  for (const r of reg) console.log(r.ok ? 'PASS' : 'FAIL', r.detail);

  console.log('\n======== unit tests ========');
  const extend = runRiffPhraseMotifSeedExtendTests();
  const sax = runRiffSaxMotifSeedPocTests();
  const p19 = runRiffMotifFidelityPhase19Tests();
  for (const r of [...extend, ...sax, ...p19]) {
    if (!r.ok) console.log('FAIL', r.name);
  }
  const unitFails = [...extend, ...sax, ...p19].filter((r) => !r.ok).length;
  console.log(
    'unit fails:',
    unitFails,
    '(extend',
    extend.filter((r) => !r.ok).length,
    'sax',
    sax.filter((r) => !r.ok).length,
    'p19',
    p19.filter((r) => !r.ok).length,
    ')'
  );

  const summary = {
    phase: 'phrase motif-seed extend (jazz_rock/mahavishnu + diminished/fripp)',
    confirmSetNote:
      'Sax Phase 1.9 confirm set = 424242, 777001, 90210. Seed 1307 / be30slfg_020 bars5-5 excluded: 2-interval degenerate phrase — known edge case, not a fix failure.',
    pairings: reports,
    regression: reg,
    unitTestFails: unitFails,
  };

  const summaryPath = path.resolve(__dirname, '../../../output/riff-phrase-motif-seed-extend-report.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  for (const r of reports) {
    fs.writeFileSync(
      path.join(r.outDir as string, 'gce-fidelity-report.json'),
      JSON.stringify(r, null, 2),
      'utf8'
    );
  }
  console.log('\nWrote', summaryPath);
  clearFlags();
}

main();