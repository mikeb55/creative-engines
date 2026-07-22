/**
 * Formal GCE + structural A/B for Phase 2 sax motif-seed POC (weather_report).
 *
 * Rebuilds same ScoreModels as exportRiffSaxMotifSeedPocExamples.ts, runs evaluateGce
 * + GCE_FRAMEWORK_V2 hard gates (Jamerson-style detector).
 *
 *   npx tsx --tsconfig ../../tsconfig.json scripts/compareRiffSaxMotifSeedPocGce.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildRiffScoreModel } from '../core/riff-generator/buildRiffScoreModel';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';
import {
  RIFF_SAX_MOTIF_SEED_POC_ENV,
  RIFF_SAX_MOTIF_SEED_POC_VRB,
  pickSaxInspiredPhraseForSeed,
  resetRiffSaxMotifSeedPocCacheForTests,
  resolveRiffCoreMotif,
} from '../core/riff-generator/riffSaxMotifSeedPoc';
import type { CoreMotif } from '../core/motif/motifEngineTypes';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
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
import { isTonicFamilyChord } from './eval/jamersonBassLensEvalCore';
import type { GceCategory } from '../core/evaluation/evaluationTypes';

const SEEDS = [424242, 777001, 1307, 90210] as const;
const OUT_DIR = path.resolve(__dirname, '../../../output/riff-sax-motif-seed-poc');

function setFlag(on: boolean): void {
  if (on) process.env[RIFF_SAX_MOTIF_SEED_POC_ENV] = '1';
  else delete process.env[RIFF_SAX_MOTIF_SEED_POC_ENV];
  resetRiffSaxMotifSeedPocCacheForTests();
}

function build(seed: number) {
  const style = 'metheny' as const;
  const profile = resolveRiffGeneratorProfile({
    vrbId: RIFF_SAX_MOTIF_SEED_POC_VRB,
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
    vrbId: RIFF_SAX_MOTIF_SEED_POC_VRB,
    chordSymbols: ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'Am7', 'D7', 'Gmaj7', 'Cmaj7'],
    bpm: 112,
    title: 'WR sax-motif POC seed ' + seed,
    riffProfile: profile,
  });
}

function melodyNotesInBar(score: ScoreModel, bar: number): number {
  const partId = resolveMelodicPartId(score);
  const part = score.parts.find((p) => p.id === partId) ?? score.parts[0];
  const m = part?.measures.find((x) => x.index === bar);
  if (!m) return 0;
  return m.events.filter((e) => e.kind === 'note').length;
}

function isDominantFamilyChord(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return false;
  if (isTonicFamilyChord(s)) return false;
  const q = s.toLowerCase();
  return q.includes('13') || q.includes('alt') || (q.includes('7') && !q.includes('maj7'));
}

function finalBarTension(score: ScoreModel, chords: string[]): number {
  const finalBar = chords.length;
  const chord = (chords[finalBar - 1] ?? '').trim();
  const shortMelodicEnding = melodyNotesInBar(score, finalBar) <= 2;
  let tension: number;
  if (isDominantFamilyChord(chord)) tension = 0.95 + (shortMelodicEnding ? 0.15 : 0);
  else if (isTonicFamilyChord(chord)) tension = 0.15;
  else tension = 0.55;
  return Math.min(1, tension);
}

function hardGates(score: ScoreModel) {
  const { chords, sections } = buildFallbackChordsAndSectionsFromScore(score);
  const melody = scoreModelToMelodicLine(score, resolveMelodicPartId(score));

  const melodic = scoreMelodicIdentity(melody, 'weather_report');
  const melodicFail = melodic.score <= 6 || melodic.justification.includes('[HARD FAIL]');

  const structure = scoreStructureAndForm(score, chords, sections);
  const sectionFail = structure.justification.includes('[HARD FAIL');

  const cadence = scoreCadentialClarity(melody, chords, sections);
  const coverage = cadence.score / 10;
  const cadenceFail = coverage < 0.4;

  const tension = finalBarTension(score, chords);
  const finalFail = tension > 0.7;

  const gates = [
    { id: 'melodicIdentity', pass: !melodicFail, detail: `score=${melodic.score}; ${melodic.justification}` },
    { id: 'sectionContrast', pass: !sectionFail, detail: structure.justification },
    {
      id: 'cadentialClarityCoverage',
      pass: !cadenceFail,
      detail: `score=${cadence.score}; coverage=${coverage.toFixed(3)}; ${cadence.justification}`,
    },
    {
      id: 'finalBarTension',
      pass: !finalFail,
      detail: `proxy=${tension.toFixed(3)} finalChord=${chords[chords.length - 1] ?? ''}`,
    },
  ] as const;

  return { gates, allPass: gates.every((g) => g.pass), coverage, tension };
}

function classifyContour(contour: number[]): string {
  if (contour.length === 0) return 'empty';
  const ups = contour.filter((c) => c > 0).length;
  const downs = contour.filter((c) => c < 0).length;
  const flats = contour.filter((c) => c === 0).length;
  if (ups === 0 && downs === 0) return 'static';
  if (downs === 0 && ups > 0) return 'ascending';
  if (ups === 0 && downs > 0) return 'descending';
  // arch: rise then fall (or inverse)
  const mid = Math.floor(contour.length / 2);
  const first = contour.slice(0, mid);
  const second = contour.slice(mid);
  const firstNet = first.reduce((a, b) => a + b, 0);
  const secondNet = second.reduce((a, b) => a + b, 0);
  if (firstNet > 0 && secondNet < 0) return 'arch';
  if (firstNet < 0 && secondNet > 0) return 'inverted-arch';
  if (flats > contour.length * 0.4) return 'plateau-zigzag';
  return 'zigzag';
}

function registerBand(tags: string[] | undefined, midis: number[]): string {
  if (tags?.includes('low')) return 'low';
  if (tags?.includes('high')) return 'high';
  if (tags?.includes('mid')) return 'center';
  if (midis.length === 0) return 'unknown';
  const mean = midis.reduce((a, b) => a + b, 0) / midis.length;
  if (mean < 55) return 'low';
  if (mean > 72) return 'high';
  return 'center';
}

function intervalSimilarity(a: number[], b: number[]): {
  exactMatch: boolean;
  longestPrefix: number;
  cosineLike: number;
  aLen: number;
  bLen: number;
} {
  const n = Math.min(a.length, b.length);
  let prefix = 0;
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  const cosineLike = n === 0 ? 0 : denom === 0 ? (prefix === n ? 1 : 0) : dot / denom;
  return {
    exactMatch: a.length === b.length && a.every((v, i) => v === b[i]),
    longestPrefix: prefix,
    cosineLike: Math.round(cosineLike * 1000) / 1000,
    aLen: a.length,
    bLen: b.length,
  };
}

function realizedIntervals(score: ScoreModel): number[] {
  const melody = scoreModelToMelodicLine(score, resolveMelodicPartId(score));
  const pitches = melody.filter((n) => !n.rest && n.midi > 0).map((n) => n.midi);
  const out: number[] = [];
  for (let i = 1; i < pitches.length; i++) out.push(pitches[i]! - pitches[i - 1]!);
  return out;
}

function realizedMidis(score: ScoreModel): number[] {
  const melody = scoreModelToMelodicLine(score, resolveMelodicPartId(score));
  return melody.filter((n) => !n.rest && n.midi > 0).map((n) => n.midi);
}

function runGce(score: ScoreModel) {
  const features = extractScoreModelFeatures(score);
  const gce = evaluateGce({
    output: score,
    features,
    weights: defaultGceWeights,
    metadata: { songwriterStyleId: 'weather_report' },
  });
  const categories = {} as Record<GceCategory, number>;
  for (const cat of GCE_CATEGORY_ORDER) categories[cat] = gce.categories[cat].score;
  return {
    finalScore: gce.finalScore,
    pass: gce.pass,
    weakestCategory: gce.weakestCategory,
    strongestCategory: gce.strongestCategory,
    categories,
  };
}

function motifStruct(motif: CoreMotif, midis: number[]) {
  return {
    id: motif.id,
    intervalSequence: motif.intervalPattern,
    contour: motif.contourPattern,
    contourClass: classifyContour(motif.contourPattern),
    register: registerBand(motif.registerTags as string[] | undefined, midis),
    registerTags: motif.registerTags,
  };
}

function directionSummary(
  onOverall: number,
  offOverall: number,
  onCats: Record<GceCategory, number>,
  offCats: Record<GceCategory, number>
): string {
  const deltas = GCE_CATEGORY_ORDER.map((c) => ({
    c,
    d: onCats[c] - offCats[c],
  })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const top = deltas[0]!;
  const verb = top.d > 0.05 ? 'improved' : top.d < -0.05 ? 'regressed' : 'flat';
  const overallDir =
    onOverall > offOverall + 0.05 ? 'up' : onOverall < offOverall - 0.05 ? 'down' : 'flat';
  return `ON scores ${onOverall} vs OFF's ${offOverall} on GCE; direction: ${top.c} ${verb} (Δ${top.d >= 0 ? '+' : ''}${top.d.toFixed(1)}; overall ${overallDir}).`;
}

function main(): void {
  const rows: unknown[] = [];
  const table: string[] = [];
  const summaries: string[] = [];

  table.push(
    '| seed | phrase | OFF overall | OFF weakest | ON overall | ON weakest | Δ | hard OFF | hard ON | gates changed |'
  );
  table.push('|---|---|---|---|---|---|---|---|---|---|');

  for (const seed of SEEDS) {
    setFlag(false);
    const offBuilt = build(seed);
    const offMotif = resolveRiffCoreMotif(seed, RIFF_SAX_MOTIF_SEED_POC_VRB);
    const offGce = runGce(offBuilt.score);
    const offHard = hardGates(offBuilt.score);
    const offMidis = realizedMidis(offBuilt.score);
    const offStruct = motifStruct(offMotif, offMidis);
    const offRealized = realizedIntervals(offBuilt.score);

    setFlag(true);
    const phrase = pickSaxInspiredPhraseForSeed(seed);
    const onBuilt = build(seed);
    const onMotif = resolveRiffCoreMotif(seed, RIFF_SAX_MOTIF_SEED_POC_VRB);
    const onGce = runGce(onBuilt.score);
    const onHard = hardGates(onBuilt.score);
    const onMidis = realizedMidis(onBuilt.score);
    const onStruct = motifStruct(onMotif, onMidis);
    const onRealized = realizedIntervals(onBuilt.score);

    const phraseId = phrase?.id ?? '(none)';
    const phraseIntervals = phrase?.intervalSequence ?? [];
    const phraseContour = phrase?.contour ?? [];
    const motifVsPhrase = intervalSimilarity(onMotif.intervalPattern, phraseIntervals);
    const realizedVsPhrase = intervalSimilarity(
      onRealized.slice(0, phraseIntervals.length),
      phraseIntervals
    );

    const offFails = offHard.gates.filter((g) => !g.pass).map((g) => g.id);
    const onFails = onHard.gates.filter((g) => !g.pass).map((g) => g.id);
    const introduced = onFails.filter((id) => !offFails.includes(id));
    const removed = offFails.filter((id) => !onFails.includes(id));

    const summary = directionSummary(
      onGce.finalScore,
      offGce.finalScore,
      onGce.categories,
      offGce.categories
    );
    summaries.push(`seed ${seed} (${phraseId}): ${summary}`);

    const delta = Math.round((onGce.finalScore - offGce.finalScore) * 10) / 10;
    table.push(
      `| ${seed} | ${phraseId.replace(/^sax_inspired__/, '').slice(0, 28)} | ${offGce.finalScore} | ${offGce.weakestCategory} | ${onGce.finalScore} | ${onGce.weakestCategory} | ${delta >= 0 ? '+' : ''}${delta} | ${offHard.allPass ? 'PASS' : 'FAIL'} | ${onHard.allPass ? 'PASS' : 'FAIL'} | intro:${introduced.join(',') || '—'} rem:${removed.join(',') || '—'} |`
    );

    rows.push({
      seed,
      phraseId,
      shortFormNote: '8-bar riff — thematicRecall / structureAndForm / phraseGrammar structurally limited',
      off: {
        motif: offStruct,
        realizedIntervals: offRealized.slice(0, 24),
        gce: offGce,
        hardGates: offHard,
      },
      on: {
        motif: onStruct,
        realizedIntervals: onRealized.slice(0, 24),
        gce: onGce,
        hardGates: onHard,
      },
      structural: {
        phraseIntervalSequence: phraseIntervals,
        phraseContour,
        phraseContourClass: classifyContour(phraseContour),
        phraseRegister: phrase
          ? registerBand(undefined, [
              phrase.registerLow,
              phrase.registerCenter,
              phrase.registerHigh,
            ])
          : 'n/a',
        onMotifVsPhraseIntervals: motifVsPhrase,
        onRealizedVsPhraseIntervals: realizedVsPhrase,
        offVsOnMotifIntervals: intervalSimilarity(offMotif.intervalPattern, onMotif.intervalPattern),
      },
      hardGateDelta: { introduced, removed },
      oneLiner: summary,
    });
  }

  setFlag(false);

  const report = {
    mode: 'formal/technical GCE (evaluateGce + defaultGceWeights + GCE_FRAMEWORK_V2 hard gates)',
    note: 'Short-form 8-bar: thematicRecall / structure&form / phraseGrammar N/A-leaning; still scored.',
    tableMarkdown: table.join('\n'),
    summaries,
    pairs: rows,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'gce-on-off-compare.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(table.join('\n'));
  console.log('');
  for (const s of summaries) console.log(s);
  console.log('\nWrote', outPath);
}

main();
