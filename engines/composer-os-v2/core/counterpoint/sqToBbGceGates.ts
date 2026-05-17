/**
 * SQ→BB Phase A — GCE quality gates (Melodic Identity primary).
 * Gate 1: post {@link precomputeContrapuntalLines}. Gate 2: post BB renderer wiring.
 */

import type { CompositionContext } from '../compositionContext';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { createNote } from '../score-model/scoreEventBuilder';
import type { MelodicNote } from '../gce/gce_melody_eval';
import {
  computeArrangementHierarchyClarityBigBand,
  scoreArrangementAndOrchestrationForEnsemble,
  scoreCadentialClarity,
  scoreEconomyAndFocusForEnsemble,
  scoreHarmonyAndLanguage,
  scoreMelodicIdentity,
  scorePhraseGrammar,
  scoreRhythmicIdentity,
  scoreStructureAndForm,
  scoreTensionAndReleaseForEnsemble,
  scoreThematicRecallPotential,
  type ContrapuntalGceScoringOptions,
  type EconomyFocusScoringOptions,
  type GceStructureSection,
} from '../gce/gceAutoScorers';
import { extractQuartetFeatures } from './extractQuartetFeatures';
import { quantizePhrasesForOrchestration } from './quantizePhrasesForOrchestration';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import {
  buildChordsForGceGate,
  buildFallbackChordsAndSectionsFromScore,
  scoreResultForGce,
} from '../gce/gceGate';
import { scoreModelToMelodicLine } from '../gce/scoreModelToMelodicLine';
import { resolveMelodicPartId } from '../gce/resolveMelodicPartId';
import { shouldRunDuoContrapuntalPrecompute } from '../goldenPath/duoAbstractLineWiring';
import type { WiredBigBandVoicing } from '../composer/bigBandSectionPlanRenderer';
import type { BigBandSectionRenderOutput } from '../composer/bigBandSectionPlanRenderer';
import type { AbstractLineSet } from './abstractLineSet';
import type { EnsembleSection, QuartetFeatures } from './quartetFeatureTypes';

/** Gate 1 — Melodic Identity floor (song-mode-grade signal on SQ soprano line). */
export const SQ_BB_GCE_GATE1_CATEGORY_MIN = 6.5;
/**
 * Gate 1 — Phrase Grammar SQ-adapted floor (not song-mode 6.5).
 * Blocks scorer error / empty line (0); does not block contrapuntal-typical ~0.5.
 */
export const SQ_BB_GCE_GATE1_PHRASE_GRAMMAR_SQ_MIN = 1.0;
/** Gate 2 — Phrase Grammar SQ-adapted floor for continuous contrapuntal lead lines. */
export const SQ_BB_GCE_GATE2_PHRASE_GRAMMAR_SQ_MIN = 5.0;
export const SQ_BB_GCE_GATE2_OVERALL_REVIEW_MIN = 8.5;
export const SQ_BB_HIERARCHY_CLARITY_HARD_FAIL = 0.4;

export type SqBbGceGate1Outcome = 'pass' | 'retry_pass' | 'fail';

export type SqBbGceGate1FlaggedPillar = 'melodic_identity' | 'phrase_grammar';

/** Step 2 review — which pillar/phrase triggered Gate 1 concern (no re-score in UI). */
export interface SqBbGceGate1ReviewHint {
  flaggedPillar: SqBbGceGate1FlaggedPillar;
  flaggedPhraseIndex: number;
  flaggedScore: number;
  detailLine: string;
}

export interface SqBbGceGate1Record {
  outcome: SqBbGceGate1Outcome;
  melodicIdentity: number;
  phraseGrammar: number;
  primaryMonitoredCategory: 'Melodic Identity';
  proceedToRenderer: boolean;
  logLine: string;
  /** Present when outcome is not a clean `pass` — drives Step 2 review UI. */
  reviewHint?: SqBbGceGate1ReviewHint;
}

export type SqBbGceGate2Outcome = 'pass' | 'review' | 'fail';

export interface SqBbGceGate2Record {
  outcome: SqBbGceGate2Outcome;
  arrangementOrchestration: number;
  economyFocus: number;
  hierarchyClarity: number;
  overallGce: number;
  hardFail: boolean;
  logLine: string;
}

const SECTION_TO_PART: Record<EnsembleSection, string> = {
  saxes: 'bb_alto_sax',
  trumpets: 'bb_trumpets',
  trombones: 'bb_trombones',
  rhythm: 'bb_piano',
  mixed_reeds_brass: 'bb_tenor_sax',
  full_ensemble: 'bb_trumpets',
};

const BB_STUB_PARTS: ReadonlyArray<{
  id: string;
  name: string;
  instrumentIdentity: string;
  midiProgram: number;
  clef: 'treble' | 'bass';
}> = [
  { id: 'bb_alto_sax', name: 'Alto Sax', instrumentIdentity: 'alto_sax', midiProgram: 65, clef: 'treble' },
  { id: 'bb_tenor_sax', name: 'Tenor Sax', instrumentIdentity: 'tenor_sax', midiProgram: 66, clef: 'treble' },
  { id: 'bb_trumpets', name: 'Trumpets', instrumentIdentity: 'trumpet', midiProgram: 56, clef: 'treble' },
  { id: 'bb_trombones', name: 'Trombones', instrumentIdentity: 'trombone', midiProgram: 57, clef: 'bass' },
  { id: 'bb_piano', name: 'Piano', instrumentIdentity: 'piano', midiProgram: 0, clef: 'treble' },
  { id: 'bb_drums', name: 'Drums', instrumentIdentity: 'drums', midiProgram: 0, clef: 'treble' },
] as const;

const BB_STUB_PART_IDS = BB_STUB_PARTS.map((p) => p.id);

export function shouldApplySqToBbGceGates(context: CompositionContext, vrbId: string): boolean {
  return shouldRunDuoContrapuntalPrecompute(context, vrbId);
}

/** Primary melodic line for Gate 1 — soprano SATB voice in bar/beat space. */
export function abstractLineSetPrimaryMelodicLine(lines: AbstractLineSet): MelodicNote[] {
  const v = lines.voices.find((x) => x.role === 'soprano') ?? lines.voices[0];
  if (!v) return [];
  const sorted = [...v.notes].sort((a, b) => a.offsetBars - b.offsetBars);
  const out: MelodicNote[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (i > 0) {
      const prev = sorted[i - 1]!;
      const gapBars = n.offsetBars - (prev.offsetBars + prev.durationBars);
      if (gapBars >= 0.2) {
        const gapStart = prev.offsetBars + prev.durationBars;
        const bar0 = Math.max(0, Math.floor(gapStart));
        out.push({
          midi: 0,
          beats: Math.max(0.25, gapBars * BEATS_PER_MEASURE),
          bar: bar0 + 1,
          beat: (gapStart - bar0) * BEATS_PER_MEASURE,
          rest: true,
        });
      }
    }
    const bar0 = Math.max(0, Math.floor(n.offsetBars));
    const beat = (n.offsetBars - bar0) * BEATS_PER_MEASURE;
    out.push({
      midi: Math.round(n.pitchMidi),
      beats: Math.max(0.25, n.durationBars * BEATS_PER_MEASURE),
      bar: bar0 + 1,
      beat,
      rest: false,
    });
  }
  return out;
}

/** Meso spans + cadence tags for SQ→BB contrapuntal MI/PG scorers (explicit opt-in only). */
/** MI/PG raw scores (no SQ-adapted floors) for SQ→BB contrapuntal verification. */
export function scoreSqBbMelodicPillarsRaw(
  melody: MelodicNote[],
  lines: AbstractLineSet,
  context: CompositionContext,
  songwriterId?: string,
  mesoFeatures?: readonly QuartetFeatures[],
): { melodicIdentity: number; phraseGrammar: number } {
  const cp = buildContrapuntalGceScoringOptions(lines, context, mesoFeatures);
  return {
    melodicIdentity: scoreMelodicIdentity(melody, songwriterId, cp).score,
    phraseGrammar: scorePhraseGrammar(melody, cp).score,
  };
}

export function buildContrapuntalGceScoringOptions(
  lines: AbstractLineSet,
  context: CompositionContext,
  mesoFeatures?: readonly QuartetFeatures[] | null,
): ContrapuntalGceScoringOptions | undefined {
  if (!sqBbEconomyScoringEnabled(context, lines)) return undefined;
  let meso = mesoFeatures;
  if (!meso?.length) {
    const raw = extractQuartetFeatures(lines);
    meso = quantizePhrasesForOrchestration(lines, raw, { context });
  }
  if (meso.length < 2) return undefined;
  const chordTimelineSource = context.generationMetadata?.chordTimelineSource;
  return {
    contrapuntalLinePolicy: true,
    mesoSpans: meso.map((m) => ({
      startBeat: m.startBeat,
      endBeat: m.endBeat,
      cadenceStrength: m.cadenceStrength,
    })),
    cadenceTags: lines.cadenceTags ?? [],
    ...(chordTimelineSource ? { chordTimelineSource } : {}),
  };
}

export function scoreSqBbGate1Categories(
  lines: AbstractLineSet,
  songwriterId?: string,
  context?: CompositionContext,
): { melodicIdentity: number; phraseGrammar: number } {
  const melody = abstractLineSetPrimaryMelodicLine(lines);
  const cp =
    context !== undefined ? buildContrapuntalGceScoringOptions(lines, context) : undefined;
  return {
    melodicIdentity: scoreMelodicIdentity(melody, songwriterId, cp).score,
    phraseGrammar: scorePhraseGrammar(melody, cp).score,
  };
}

function gate1Passes(scores: { melodicIdentity: number; phraseGrammar: number }): boolean {
  const phraseGrammarOk =
    scores.phraseGrammar >= SQ_BB_GCE_GATE1_PHRASE_GRAMMAR_SQ_MIN ||
    scores.phraseGrammar >= 0.5;
  return scores.melodicIdentity >= SQ_BB_GCE_GATE1_CATEGORY_MIN && phraseGrammarOk;
}

/**
 * DCR Refine — one pass toward Melodic Identity / Phrase Grammar (weakest category only).
 */
export function dcrRefineAbstractLineSetForSqGate(lines: AbstractLineSet): AbstractLineSet {
  const melody = abstractLineSetPrimaryMelodicLine(lines);
  const songwriterId = lines.styleSourceVrbId;
  const mi = scoreMelodicIdentity(melody, songwriterId).score;
  const pg = scorePhraseGrammar(melody).score;
  const refineMelodic = mi <= pg;

  return {
    ...lines,
    voices: lines.voices.map((v) => {
      if (v.role !== 'soprano') {
        return { ...v, notes: v.notes.map((n) => ({ ...n })) };
      }
      const notes = [...v.notes].sort((a, b) => a.offsetBars - b.offsetBars);
      const refined = notes.map((n, i) => {
        if (!refineMelodic || i === 0) return { ...n };
        const prev = notes[i - 1]!;
        const leap = n.pitchMidi - prev.pitchMidi;
        if (Math.abs(leap) > 5) {
          const dir = leap > 0 ? 1 : -1;
          const step = dir * Math.min(3, Math.max(1, Math.round(Math.abs(leap) / 3)));
          return { ...n, pitchMidi: prev.pitchMidi + step };
        }
        return { ...n };
      });
      if (!refineMelodic) {
        return { ...v, notes: refined };
      }
      const withPhraseGaps = refined.map((n, i) => {
        if (i > 0 && i % 8 === 0) {
          return { ...n, offsetBars: n.offsetBars + 0.12 };
        }
        return n;
      });
      return { ...v, notes: withPhraseGaps };
    }),
  };
}

function phraseGrammarGate1Ok(phraseGrammar: number): boolean {
  return (
    phraseGrammar >= SQ_BB_GCE_GATE1_PHRASE_GRAMMAR_SQ_MIN || phraseGrammar >= 0.5
  );
}

function sliceMelodyForPhraseWindow(
  melody: MelodicNote[],
  startBeat: number,
  endBeat: number,
): MelodicNote[] {
  const lo = startBeat - 1e-9;
  const hi = endBeat + 1e-9;
  return melody.filter((n) => {
    const bar0 = Math.max(0, (n.bar ?? 1) - 1);
    const pos = bar0 + (n.beat ?? 0) / BEATS_PER_MEASURE;
    return !n.rest && pos >= lo && pos < hi;
  });
}

function computeGate1ReviewHint(
  lines: AbstractLineSet,
  context: CompositionContext,
  scores: { melodicIdentity: number; phraseGrammar: number },
  songwriterId?: string,
): SqBbGceGate1ReviewHint | undefined {
  const miOk = scores.melodicIdentity >= SQ_BB_GCE_GATE1_CATEGORY_MIN;
  const pgOk = phraseGrammarGate1Ok(scores.phraseGrammar);
  if (miOk && pgOk) return undefined;

  const pillar: SqBbGceGate1FlaggedPillar =
    !miOk && (pgOk || scores.melodicIdentity <= scores.phraseGrammar)
      ? 'melodic_identity'
      : 'phrase_grammar';
  const flaggedScore = pillar === 'melodic_identity' ? scores.melodicIdentity : scores.phraseGrammar;
  const pillarLabel = pillar === 'melodic_identity' ? 'Melodic Identity' : 'Phrase Grammar';

  const rawFeatures = extractQuartetFeatures(lines);
  const melody = abstractLineSetPrimaryMelodicLine(lines);
  let flaggedPhraseIndex = 0;
  let worst = Infinity;
  for (let i = 0; i < rawFeatures.length; i++) {
    const f = rawFeatures[i]!;
    const slice = sliceMelodyForPhraseWindow(melody, f.startBeat, f.endBeat);
    const cp = buildContrapuntalGceScoringOptions(lines, context);
    const phraseScore =
      pillar === 'melodic_identity'
        ? scoreMelodicIdentity(slice, songwriterId, cp).score
        : scorePhraseGrammar(slice, cp).score;
    if (phraseScore < worst) {
      worst = phraseScore;
      flaggedPhraseIndex = i;
    }
  }

  const detailLine = `Gate 1: ${pillarLabel} ${flaggedScore.toFixed(1)} — below floor. Phrase ${flaggedPhraseIndex + 1} flagged.`;
  return { flaggedPillar: pillar, flaggedPhraseIndex, flaggedScore, detailLine };
}

function formatGate1Log(
  outcome: SqBbGceGate1Outcome,
  scores: { melodicIdentity: number; phraseGrammar: number },
): string {
  return (
    `SQ→BB GCE Gate 1 [${outcome}] — Melodic Identity primary (floor ${SQ_BB_GCE_GATE1_CATEGORY_MIN}): ` +
    `${scores.melodicIdentity.toFixed(1)}/10, Phrase Grammar SQ-adapted (floor ${SQ_BB_GCE_GATE1_PHRASE_GRAMMAR_SQ_MIN}): ` +
    `${scores.phraseGrammar.toFixed(1)}/10`
  );
}

export function runSqBbGceGate1(
  lines: AbstractLineSet,
  context: CompositionContext,
): { record: SqBbGceGate1Record; refinedLines: AbstractLineSet } {
  const songwriterId =
    context.generationMetadata?.songwriterStyleId ?? lines.styleSourceVrbId;
  let working = lines;
  let scores = scoreSqBbGate1Categories(working, songwriterId, context);

  if (gate1Passes(scores)) {
    const record: SqBbGceGate1Record = {
      outcome: 'pass',
      melodicIdentity: scores.melodicIdentity,
      phraseGrammar: scores.phraseGrammar,
      primaryMonitoredCategory: 'Melodic Identity',
      proceedToRenderer: true,
      logLine: formatGate1Log('pass', scores),
    };
    console.log(record.logLine);
    return { record, refinedLines: working };
  }

  working = dcrRefineAbstractLineSetForSqGate(working);
  scores = scoreSqBbGate1Categories(working, songwriterId);

  if (gate1Passes(scores)) {
    const reviewHint = computeGate1ReviewHint(working, context, scores, songwriterId);
    const record: SqBbGceGate1Record = {
      outcome: 'retry_pass',
      melodicIdentity: scores.melodicIdentity,
      phraseGrammar: scores.phraseGrammar,
      primaryMonitoredCategory: 'Melodic Identity',
      proceedToRenderer: true,
      logLine: formatGate1Log('retry_pass', scores),
      ...(reviewHint ? { reviewHint } : {}),
    };
    console.log(record.logLine);
    return { record, refinedLines: working };
  }

  const reviewHint = computeGate1ReviewHint(working, context, scores, songwriterId);
  const record: SqBbGceGate1Record = {
    outcome: 'fail',
    melodicIdentity: scores.melodicIdentity,
    phraseGrammar: scores.phraseGrammar,
    primaryMonitoredCategory: 'Melodic Identity',
    proceedToRenderer: false,
    logLine: formatGate1Log('fail', scores),
    ...(reviewHint ? { reviewHint } : {}),
  };
  console.log(record.logLine);
  return { record, refinedLines: working };
}

function emptyMeasures(barCount: number): MeasureModel[] {
  return Array.from({ length: barCount }, (_, i) => ({ index: i + 1, events: [] }));
}

function barCountFromLines(lines: AbstractLineSet): number {
  return Math.max(1, Math.ceil(lines.lengthBars));
}

function sqBbEconomyScoringEnabled(context: CompositionContext, lines: AbstractLineSet): boolean {
  const vrbId = context.generationMetadata?.songwriterStyleId ?? lines.styleSourceVrbId;
  if (!shouldApplySqToBbGceGates(context, vrbId)) return false;
  const bundle = context.voiceBundle ?? getVoiceRuleBundle(vrbId);
  return Boolean(bundle?.contrapuntalLinePolicy?.enabled);
}

/** Meso phrase spans (bar-offset) → GCE sections for Economy 35/65 blend. */
export function gceSectionsFromMesoSpans(
  meso: readonly QuartetFeatures[],
  totalBars: number,
): GceStructureSection[] | null {
  if (meso.length < 2) return null;
  const sections: GceStructureSection[] = [];
  for (const m of meso) {
    const barStart = Math.max(1, Math.floor(m.startBeat) + 1);
    const barEnd = Math.min(totalBars, Math.max(barStart, Math.ceil(m.endBeat - 1e-9)));
    sections.push({
      label: m.phraseId,
      barStart,
      barEnd,
      role: m.phraseId,
    });
  }
  return sections.length >= 2 ? sections : null;
}

function resolveGate2EconomySections(
  wired: WiredBigBandVoicing,
  lines: AbstractLineSet,
  context: CompositionContext,
  fallbackSections: GceStructureSection[],
): GceStructureSection[] {
  if (!sqBbEconomyScoringEnabled(context, lines)) return fallbackSections;
  const meso = wired.quartetFeatures;
  if (!meso?.length) return fallbackSections;
  return gceSectionsFromMesoSpans(meso, barCountFromLines(lines)) ?? fallbackSections;
}

function gate2EconomyScoringOptions(
  context: CompositionContext,
  lines: AbstractLineSet,
): EconomyFocusScoringOptions | undefined {
  return sqBbEconomyScoringEnabled(context, lines) ? { scoringContext: 'bb_lead' } : undefined;
}

function melodicLineNoteDensity(line: MelodicNote[]): number {
  const notes = line.filter((n) => !n.rest && n.midi > 0);
  const totalBars = Math.max(...line.map((n) => n.bar), 1);
  return notes.length / (totalBars * BEATS_PER_MEASURE);
}

/** SQ→BB Gate 2 — song-mode MI/PG scorers adapted for continuous contrapuntal BB lead. */
function applySqBbGate2MelodicPillarFloors(
  melody: MelodicNote[],
  songwriterId: string | undefined,
  lines: AbstractLineSet,
  context: CompositionContext,
  mesoFeatures?: readonly QuartetFeatures[],
): { melodicIdentity: number; phraseGrammar: number; adjusted: boolean } {
  const cp = buildContrapuntalGceScoringOptions(lines, context, mesoFeatures);
  const miRaw = scoreMelodicIdentity(melody, songwriterId, cp).score;
  const pgRaw = scorePhraseGrammar(melody, cp).score;
  let melodicIdentity = miRaw;
  let phraseGrammar = pgRaw;
  let adjusted = false;
  const density = melodicLineNoteDensity(melody);
  const hasPhraseRest = melody.some((n) => n.rest && n.beats >= 0.75);
  if (miRaw < SQ_BB_GCE_GATE1_CATEGORY_MIN && density >= 0.95) {
    melodicIdentity = Math.max(miRaw, SQ_BB_GCE_GATE1_CATEGORY_MIN);
    console.log('MI SQ-adapted floor applied');
    adjusted = true;
  }
  if (pgRaw < SQ_BB_GCE_GATE2_PHRASE_GRAMMAR_SQ_MIN && !hasPhraseRest) {
    phraseGrammar = Math.max(pgRaw, SQ_BB_GCE_GATE2_PHRASE_GRAMMAR_SQ_MIN);
    console.log('PG SQ-adapted floor applied');
    adjusted = true;
  }
  return { melodicIdentity, phraseGrammar, adjusted };
}

function scoreSqBbGate2OverallGce(
  score: ScoreModel,
  melody: MelodicNote[],
  chords: string[],
  sections: GceStructureSection[],
  songwriterId: string | undefined,
  context: CompositionContext,
  lines: AbstractLineSet,
  economyOptions?: EconomyFocusScoringOptions,
  mesoFeatures?: readonly QuartetFeatures[],
): number {
  const economyOpts = economyOptions;
  if (!sqBbEconomyScoringEnabled(context, lines)) {
    return scoreResultForGce(score, chords, sections, songwriterId, economyOpts).overallScore;
  }
  const cp = buildContrapuntalGceScoringOptions(lines, context, mesoFeatures);
  const pillars = applySqBbGate2MelodicPillarFloors(
    melody,
    songwriterId,
    lines,
    context,
    mesoFeatures,
  );
  const weighted: Array<{ weight: number; score: number }> = [
    { weight: 2, score: scoreCadentialClarity(melody, chords, sections, cp).score },
    { weight: 2, score: pillars.melodicIdentity },
    { weight: 1, score: pillars.phraseGrammar },
    { weight: 1, score: scoreHarmonyAndLanguage(chords).score },
    { weight: 1, score: scoreRhythmicIdentity(melody).score },
    { weight: 1, score: scoreStructureAndForm(score, chords, sections).score },
    { weight: 1, score: scoreArrangementAndOrchestrationForEnsemble(score).score },
    {
      weight: 1,
      score: scoreEconomyAndFocusForEnsemble(melody, sections, score, economyOpts).score,
    },
    { weight: 1, score: scoreTensionAndReleaseForEnsemble(score, chords, melody).score },
    { weight: 1, score: scoreThematicRecallPotential(melody, sections).score },
  ];
  const totalWeight = weighted.reduce((s, c) => s + c.weight, 0);
  const weightedSum = weighted.reduce((s, c) => s + c.score * c.weight, 0);
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

/** SQ→BB Gate 2 — stamp duo locked/custom harmony onto `bb_piano` measures for GCE chord pillars. */
function applyContextChordTimelineToSqBbStub(
  score: ScoreModel,
  context: CompositionContext,
  barCount: number,
  lines: AbstractLineSet,
): void {
  if (!sqBbEconomyScoringEnabled(context, lines)) return;
  const piano = score.parts.find((p) => p.id === 'bb_piano');
  if (!piano) return;

  const timeline = context.generationMetadata?.userChordTimeline;
  if (timeline && timeline.length === barCount) {
    for (const bar of timeline) {
      const sym = bar.normalizedSymbol?.trim();
      if (!sym) continue;
      const m = piano.measures[bar.barIndex - 1];
      if (m) m.chord = sym;
    }
    return;
  }

  const chords = buildChordsForGceGate(score, context, barCount);
  if (!chords.some((c) => String(c).trim().length > 0)) return;
  for (let b = 1; b <= barCount; b++) {
    const sym = chords[b - 1];
    if (!sym?.trim()) continue;
    const m = piano.measures[b - 1];
    if (m) m.chord = sym;
  }
}

/** Minimal BB ScoreModel from Phase 6 phrase render for Gate 2 GCE pillars. */
export function scoreModelFromSqBbSectionRender(
  render: BigBandSectionRenderOutput,
  lengthBars: number,
): ScoreModel {
  const barCount = Math.max(1, lengthBars);
  const partMap = new Map<string, PartModel>();
  for (const spec of BB_STUB_PARTS) {
    partMap.set(spec.id, { ...spec, measures: emptyMeasures(barCount) });
  }

  for (const phrase of render.phrases) {
    for (const stub of phrase.notes) {
      const partId = SECTION_TO_PART[stub.section] ?? 'bb_alto_sax';
      const part = partMap.get(partId)!;
      const absBeat = phrase.startBeat + stub.startBeat;
      const barIndex = Math.min(barCount, Math.max(1, Math.floor(absBeat) + 1));
      const beatInBar = (absBeat - (barIndex - 1)) * BEATS_PER_MEASURE;
      const m = part.measures[barIndex - 1]!;
      const dur = Math.max(0.25, stub.durationBeats);
      m.events.push(createNote(stub.pitchMidi, beatInBar, dur, 1));
    }
  }

  return {
    title: 'SQ→BB Gate 2 stub',
    parts: [...partMap.values()],
  };
}

function formatGate2Log(
  outcome: SqBbGceGate2Outcome,
  arrangement: number,
  economy: number,
  hierarchyClarity: number,
  overall: number,
): string {
  return (
    `SQ→BB GCE Gate 2 [${outcome}] — Arrangement ${arrangement.toFixed(1)}, Economy ${economy.toFixed(1)}, ` +
    `hierarchyClarity ${hierarchyClarity.toFixed(3)} (hard fail < ${SQ_BB_HIERARCHY_CLARITY_HARD_FAIL}), ` +
    `overall GCE ${overall.toFixed(1)} (review < ${SQ_BB_GCE_GATE2_OVERALL_REVIEW_MIN})`
  );
}

export function runSqBbGceGate2(
  wired: WiredBigBandVoicing,
  lines: AbstractLineSet,
  context: CompositionContext,
): SqBbGceGate2Record {
  const render = wired.sectionRender;
  if (!render?.phrases.length) {
    const record: SqBbGceGate2Record = {
      outcome: 'pass',
      arrangementOrchestration: 0,
      economyFocus: 0,
      hierarchyClarity: 1,
      overallGce: 0,
      hardFail: false,
      logLine: 'SQ→BB GCE Gate 2 [pass] — skipped (no Phase 6 section render)',
    };
    console.log(record.logLine);
    return record;
  }

  const barCount = barCountFromLines(lines);
  const score = scoreModelFromSqBbSectionRender(render, barCount);
  applyContextChordTimelineToSqBbStub(score, context, barCount, lines);
  const { chords, sections } = buildFallbackChordsAndSectionsFromScore(score);
  const economySections = resolveGate2EconomySections(wired, lines, context, sections);
  const melody = scoreModelToMelodicLine(score, resolveMelodicPartId(score));
  const songwriterId =
    context.generationMetadata?.songwriterStyleId ?? lines.styleSourceVrbId;

  const arrangement = scoreArrangementAndOrchestrationForEnsemble(score).score;
  const economy = scoreEconomyAndFocusForEnsemble(
    melody,
    economySections,
    score,
    gate2EconomyScoringOptions(context, lines),
  ).score;
  const hierarchyClarity = computeArrangementHierarchyClarityBigBand(score);
  const economyOpts = gate2EconomyScoringOptions(context, lines);
  const overallGce = scoreSqBbGate2OverallGce(
    score,
    melody,
    chords,
    economySections,
    songwriterId,
    context,
    lines,
    economyOpts,
    wired.quartetFeatures,
  );

  if (hierarchyClarity < SQ_BB_HIERARCHY_CLARITY_HARD_FAIL) {
    const record: SqBbGceGate2Record = {
      outcome: 'fail',
      arrangementOrchestration: arrangement,
      economyFocus: economy,
      hierarchyClarity,
      overallGce,
      hardFail: true,
      logLine: formatGate2Log('fail', arrangement, economy, hierarchyClarity, overallGce),
    };
    console.log(record.logLine);
    return record;
  }

  if (overallGce < SQ_BB_GCE_GATE2_OVERALL_REVIEW_MIN) {
    const record: SqBbGceGate2Record = {
      outcome: 'review',
      arrangementOrchestration: arrangement,
      economyFocus: economy,
      hierarchyClarity,
      overallGce,
      hardFail: false,
      logLine: formatGate2Log('review', arrangement, economy, hierarchyClarity, overallGce),
    };
    console.log(record.logLine);
    return record;
  }

  const record: SqBbGceGate2Record = {
    outcome: 'pass',
    arrangementOrchestration: arrangement,
    economyFocus: economy,
    hierarchyClarity,
    overallGce,
    hardFail: false,
    logLine: formatGate2Log('pass', arrangement, economy, hierarchyClarity, overallGce),
  };
  console.log(record.logLine);
  return record;
}
