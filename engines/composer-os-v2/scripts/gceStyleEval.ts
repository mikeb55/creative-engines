/**
 * Automated GCE-style evaluation across Song Mode primary songwriter styles (golden path duo).
 * Categories follow docs/GCE_FRAMEWORK_V2.md (10 automatable pillars where implemented).
 */

import { runGoldenPath, type GoldenPathResult } from '../core/goldenPath/runGoldenPath';
import { scoreModelToMelodicLine } from '../core/gce/scoreModelToMelodicLine';
import { resolveMelodicPartId } from '../core/gce/resolveMelodicPartId';
import {
  scoreMelodicIdentity,
  scoreHarmonyAndLanguage,
  scoreRhythmicIdentity,
  scoreStructureAndForm,
  scoreEconomyAndFocusForEnsemble,
  scoreTensionAndReleaseForEnsemble,
  scoreCadentialClarity,
  scorePhraseGrammar,
  scoreArrangementAndOrchestrationForEnsemble,
  scoreThematicRecallPotential,
  gceSectionsFromFormMap,
} from '../core/gce/gceAutoScorers';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import type { StyleProfile } from '../core/song-mode/songModeStyleProfile';
import { defaultStyleProfileForPrimarySongwriter } from '../core/song-mode/songModeStyleProfileDefaults';

/**
 * Raw preset runs — seed 50021, 32 bars, 100 bpm; no songwriter / Song Mode hook flags.
 * ECM Chamber symbolic texture (register / density / phrase-edge): `npm run eval:ecm-texture` in composer-os-v2.
 */
const GCE_EVAL_PRESETS = [
  'guitar_bass_duo',
  'guitar_bass_duo_single_line',
  'wyble_etude',
  'ecm_chamber',
  'big_band',
  'string_quartet',
  'riff_generator',
] as const;

/**
 * Former `song_mode` preset used an 8-bar golden path — GCE melody must use long-form duo (32 bars).
 * Evaluated as `guitar_bass_duo` + Song Mode hook + primary songwriter (same routing as style sweep).
 */
const SONG_MODE_GCE_RUNS = [
  { presetId: 'guitar_bass_duo' as const, primarySongwriterStyle: 'donald_fagen', label: 'song_mode_fagen' },
  { presetId: 'guitar_bass_duo' as const, primarySongwriterStyle: 'wayne_shorter', label: 'song_mode_shorter' },
  { presetId: 'guitar_bass_duo' as const, primarySongwriterStyle: 'pat_metheny', label: 'song_mode_pat_metheny' },
  { presetId: 'guitar_bass_duo' as const, primarySongwriterStyle: 'bacharach', label: 'song_mode_bacharach' },
  { presetId: 'guitar_bass_duo' as const, primarySongwriterStyle: 'barry_harris', label: 'song_mode_barry_harris' },
  { presetId: 'guitar_bass_duo' as const, primarySongwriterStyle: 'ecm_chamber', label: 'song_mode_ecm' },
] as const;

const CAT_PAD = 34;

/** Harmonic length aligned with **`runGoldenPath`** options in this harness (`totalBars: 32`). Shorter-score presets (ensemble / 8-bar brick) repeat their harmonic cycle to this length for chord-based GCE pillars. */
const GCE_HARMONIC_BAR_TARGET = 32;

/** Align Style Engine profile with primary songwriter — uses shared defaults (Pat Metheny → STYLE_PAT_METHENY, ECM chamber → STYLE_ECM_CHAMBER). */
function styleProfileForSongwriter(style: string): StyleProfile {
  return defaultStyleProfileForPrimarySongwriter(style) ?? 'STYLE_MODERN_JAZZ';
}

function maxMeasureIndexAcrossParts(score: ScoreModel): number {
  let max = 0;
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.index > max) max = m.index;
    }
  }
  return max;
}

/**
 * Chord stream for GCE harmony pillars — one symbol per bar for **`harmonicBarTarget`** (harness uses {@link GCE_HARMONIC_BAR_TARGET}).
 * Prefer **`context.lockedHarmonyBarsRaw`** when it already spans the target length (vocal-lead-sheet / locked truth path).
 * Otherwise derive one harmonic **cycle** from locked, parsed bars, or per-bar merge across all parts (`runGoldenPathOnce`
 * chord map), then **repeat** the cycle to **`harmonicBarTarget`** when the score is shorter (e.g. 8-bar ensemble brick → 32 bars).
 */
function chordsForGceScoring(result: GoldenPathResult, harmonicBarTarget: number): string[] {
  const ctx = result.context;
  const explicitBars = Math.max(ctx.form.totalBars ?? 0, maxMeasureIndexAcrossParts(result.score));
  const targetBars = Math.max(explicitBars || 0, harmonicBarTarget);

  const locked = ctx.lockedHarmonyBarsRaw;
  if (locked && locked.length === targetBars) {
    return [...locked];
  }
  const parsed = ctx.generationMetadata?.parsedCustomProgressionBars;
  if (parsed && parsed.length === targetBars) {
    return [...parsed];
  }

  let cycle: string[] | undefined;
  if (locked && locked.length > 0) cycle = [...locked];
  else if (parsed && parsed.length > 0) cycle = [...parsed];
  else if (explicitBars > 0) cycle = chordsPerBarFromScore(result.score, explicitBars);

  if (!cycle || cycle.length === 0) {
    return chordsPerBarFromScore(result.score, Math.min(targetBars, explicitBars || harmonicBarTarget));
  }

  if (targetBars % cycle.length === 0) {
    const reps = targetBars / cycle.length;
    return Array.from({ length: reps }, () => cycle).flat();
  }
  const out: string[] = [];
  while (out.length < targetBars) {
    out.push(...cycle);
  }
  return out.slice(0, targetBars);
}

/** One chord per bar (measure index 1…N), merging any part that carries `measure.chord` — matches export chord map. */
function chordsPerBarFromScore(score: ScoreModel, totalBars: number): string[] {
  const chordByBar = new Map<number, string>();
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.chord) chordByBar.set(m.index, m.chord);
    }
  }
  const out: string[] = [];
  for (let b = 1; b <= totalBars; b++) {
    out.push(chordByBar.get(b) ?? '');
  }
  return out;
}

function printGceCategories(result: GoldenPathResult): void {
  const guitarPart = result.score.parts.find((p) => p.id === 'guitar');
  if (!guitarPart || guitarPart.measures.length === 0) {
    console.log('GENERATION FAILED — no guitar score');
    console.log(result.errors?.join('; ') ?? '');
    return;
  }
  if (!result.success) {
    console.warn(
      '(Golden path success=false — behaviour/export gates; scoring duo output anyway for GCE diagnostics.)'
    );
    console.warn(result.errors?.join('; ') ?? '');
  }

  const melody = scoreModelToMelodicLine(result.score, resolveMelodicPartId(result.score));
  const chords = chordsForGceScoring(result, GCE_HARMONIC_BAR_TARGET);
  const sections = gceSectionsFromFormMap(result.context.form);

  const cadential = scoreCadentialClarity(melody, chords, sections);
  const melodic = scoreMelodicIdentity(melody, result.context.generationMetadata?.songwriterStyleId);
  const phraseGrammar = scorePhraseGrammar(melody);
  const harmony = scoreHarmonyAndLanguage(chords);
  const rhythm = scoreRhythmicIdentity(melody);
  const structure = scoreStructureAndForm(result.score, chords, sections);
  const arrangement = scoreArrangementAndOrchestrationForEnsemble(result.score);
  const economy = scoreEconomyAndFocusForEnsemble(melody, sections, result.score);
  const tension = scoreTensionAndReleaseForEnsemble(result.score, chords, melody);
  const thematicRecall = scoreThematicRecallPotential(melody, sections);

  /** Weights: Cadential + Melodic weighted 2× (critical pillars); others 1×. */
  const scores = {
    'Cadential Clarity': { ...cadential, weight: 2 },
    'Melodic Identity': { ...melodic, weight: 2 },
    'Phrase Grammar': { ...phraseGrammar, weight: 1 },
    'Harmony & Language': { ...harmony, weight: 1 },
    'Rhythmic Identity': { ...rhythm, weight: 1 },
    'Structure & Form': { ...structure, weight: 1 },
    'Arrangement & Orchestration': { ...arrangement, weight: 1 },
    'Economy & Focus': { ...economy, weight: 1 },
    'Tension & Release': { ...tension, weight: 1 },
    'Thematic Recall Potential': { ...thematicRecall, weight: 1 },
  };

  let weightedSum = 0;
  let totalWeight = 0;
  for (const [cat, data] of Object.entries(scores)) {
    console.log(`${cat.padEnd(CAT_PAD)} ${String(data.score).padStart(5)}/10  ${data.justification}`);
    weightedSum += data.score * data.weight;
    totalWeight += data.weight;
  }

  const overall = Math.round((weightedSum / totalWeight) * 10) / 10;
  console.log(`\nOVERALL GCE SCORE: ${overall}/10`);
  if (overall < 9.0) {
    const weakest = Object.entries(scores).sort((a, b) => a[1].score - b[1].score)[0]?.[0];
    console.log(`⚠ BELOW TARGET — weakest: ${weakest}`);
  } else {
    console.log('✓ MEETS GCE TARGET (≥ 9.0)');
  }
}

function main(): void {
  /** One preset per process — avoids long-run heap growth when `npm run eval:gce-styles` OOMs (e.g. ECM + trace). */
  const singlePreset = process.env.GCE_SINGLE_PRESET?.trim();
  if (singlePreset) {
    const songModeRun = SONG_MODE_GCE_RUNS.find((r) => r.label === singlePreset);
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`GCE EVALUATION — PRESET: ${singlePreset}`);
    console.log('═'.repeat(50));
    const result = songModeRun
      ? runGoldenPath(50021, {
          presetId: songModeRun.presetId,
          primarySongwriterStyle: songModeRun.primarySongwriterStyle,
          totalBars: 32,
          bpm: 100,
          longFormEnabled: true,
          creativeControlLevel: 'balanced',
          songModeHookFirstIdentity: true,
          styleProfile: styleProfileForSongwriter(songModeRun.primarySongwriterStyle),
        })
      : runGoldenPath(50021, {
          presetId: singlePreset,
          totalBars: 32,
          bpm: 100,
          longFormEnabled: true,
        });
    printGceCategories(result);
    return;
  }

  for (const presetId of GCE_EVAL_PRESETS) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`GCE EVALUATION — PRESET: ${presetId}`);
    console.log('═'.repeat(50));

    const result = runGoldenPath(50021, {
      presetId,
      totalBars: 32,
      bpm: 100,
      longFormEnabled: true,
    });

    printGceCategories(result);
  }

  for (const run of SONG_MODE_GCE_RUNS) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`GCE EVALUATION — PRESET: ${run.label}`);
    console.log('═'.repeat(50));

    const result = runGoldenPath(50021, {
      presetId: run.presetId,
      primarySongwriterStyle: run.primarySongwriterStyle,
      totalBars: 32,
      bpm: 100,
      longFormEnabled: true,
      creativeControlLevel: 'balanced',
      songModeHookFirstIdentity: true,
      styleProfile: styleProfileForSongwriter(run.primarySongwriterStyle),
    });

    printGceCategories(result);
  }
}

main();
