/**
 * GCE gate — weighted overall score aligned with `scripts/gceStyleEval.ts` pillars.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { CompositionContext } from '../compositionContext';
import { scoreModelToMelodicLine } from './scoreModelToMelodicLine';
import { resolveMelodicPartId } from './resolveMelodicPartId';
import {
  scoreMelodicIdentity,
  scoreHarmonyAndLanguage,
  scoreRhythmicIdentity,
  scoreStructureAndForm,
  scoreEconomyAndFocus,
  scoreTensionAndRelease,
  scoreCadentialClarity,
  scorePhraseGrammar,
  scoreArrangementAndOrchestration,
  scoreThematicRecallPotential,
  gceSectionsFromFormMap,
  type GceStructureSection,
} from './gceAutoScorers';

export interface GceGateResult {
  overallScore: number;
  weakestCategory: string;
  passed: boolean;
}

/** Ship gate: weighted GCE overall must meet or exceed this (aligned with Song Mode retry in `composerOsAppGeneration`). */
export const GCE_GATE_MIN = 8.0;

export function scoreResultForGce(
  score: ScoreModel,
  chords: string[],
  sections: GceStructureSection[],
  songwriterId?: string
): GceGateResult {
  const melody = scoreModelToMelodicLine(score, resolveMelodicPartId(score));

  const scores: Array<{ name: string; score: number; weight: number }> = [
    { name: 'Cadential Clarity', weight: 2, score: scoreCadentialClarity(melody, chords, sections).score },
    { name: 'Melodic Identity', weight: 2, score: scoreMelodicIdentity(melody, songwriterId).score },
    { name: 'Phrase Grammar', weight: 1, score: scorePhraseGrammar(melody).score },
    { name: 'Harmony & Language', weight: 1, score: scoreHarmonyAndLanguage(chords).score },
    { name: 'Rhythmic Identity', weight: 1, score: scoreRhythmicIdentity(melody).score },
    { name: 'Structure & Form', weight: 1, score: scoreStructureAndForm(score, chords, sections).score },
    { name: 'Arrangement & Orchestration', weight: 1, score: scoreArrangementAndOrchestration(score).score },
    { name: 'Economy & Focus', weight: 1, score: scoreEconomyAndFocus(melody).score },
    { name: 'Tension & Release', weight: 1, score: scoreTensionAndRelease(chords).score },
    { name: 'Thematic Recall Potential', weight: 1, score: scoreThematicRecallPotential(melody, sections).score },
  ];

  const totalWeight = scores.reduce((s, c) => s + c.weight, 0);
  const weightedSum = scores.reduce((s, c) => s + c.score * c.weight, 0);
  const overallScore = Math.round((weightedSum / totalWeight) * 10) / 10;

  const weakest = scores.reduce((a, b) => (a.score <= b.score ? a : b));

  return {
    overallScore,
    weakestCategory: weakest.name,
    passed: overallScore >= GCE_GATE_MIN,
  };
}

/** Fallback chord timeline + sections (from rehearsal marks when present — BB / Orbit). */
export function buildFallbackChordsAndSectionsFromScore(score: ScoreModel): {
  chords: string[];
  sections: GceStructureSection[];
} {
  const tb = Math.max(1, maxMeasureIndexAcrossParts(score));
  const chords = chordsPerBarFromScore(score, tb);
  const fromMarks = gceSectionsFromRehearsalMarks(score, tb);
  const sections =
    fromMarks && fromMarks.length >= 2
      ? fromMarks
      : [{ label: 'full', barStart: 1, barEnd: tb, role: 'full' }];
  return { chords, sections };
}

/** Derive GCE sections from measure rehearsal marks (typically BB slice starts — intro / head / solo / shout / ending). */
export function gceSectionsFromRehearsalMarks(
  score: ScoreModel,
  totalBars: number
): GceStructureSection[] | null {
  const part =
    score.parts.find((p) => p.id === 'bb_alto_sax') ??
    score.parts.find((p) => p.measures.some((m) => m.rehearsalMark?.trim())) ??
    score.parts[0];
  if (!part) return null;

  const breaks: Array<{ bar: number; label: string }> = [];
  for (const m of part.measures) {
    const rm = m.rehearsalMark?.trim();
    if (rm) breaks.push({ bar: m.index, label: rm });
  }
  breaks.sort((a, b) => a.bar - b.bar);
  if (breaks.length === 0) return null;
  if (breaks[0]!.bar > 1) {
    breaks.unshift({ bar: 1, label: 'opening' });
  }

  const sections: GceStructureSection[] = [];
  for (let i = 0; i < breaks.length; i++) {
    const start = breaks[i]!.bar;
    const end =
      i + 1 < breaks.length ? Math.min(breaks[i + 1]!.bar - 1, totalBars) : totalBars;
    if (start > totalBars) continue;
    const lab = breaks[i]!.label;
    sections.push({
      label: lab,
      barStart: start,
      barEnd: Math.max(start, end),
      role: lab,
    });
  }
  return sections.length >= 2 ? sections : null;
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

/** Chord stream for GCE pillars — mirrors `scripts/gceStyleEval.ts` `chordsForGceScoring`. */
export function buildChordsForGceGate(
  score: ScoreModel,
  context: CompositionContext,
  harmonicBarTarget: number
): string[] {
  const explicitBars = Math.max(context.form.totalBars ?? 0, maxMeasureIndexAcrossParts(score));
  const targetBars = Math.max(explicitBars || 0, harmonicBarTarget);

  const locked = context.lockedHarmonyBarsRaw;
  if (locked && locked.length === targetBars) {
    return [...locked];
  }
  const parsed = context.generationMetadata?.parsedCustomProgressionBars;
  if (parsed && parsed.length === targetBars) {
    return [...parsed];
  }

  let cycle: string[] | undefined;
  if (locked && locked.length > 0) cycle = [...locked];
  else if (parsed && parsed.length > 0) cycle = [...parsed];
  else if (explicitBars > 0) cycle = chordsPerBarFromScore(score, explicitBars);

  if (!cycle || cycle.length === 0) {
    return chordsPerBarFromScore(score, Math.min(targetBars, explicitBars || harmonicBarTarget));
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

/** Same harmonic bar span as app Song Mode clamp default (32). */
export const GCE_GATE_HARMONIC_BAR_TARGET = 32;

export function scoreGoldenPathResultForGce(
  score: ScoreModel,
  context: CompositionContext,
  harmonicBarTarget: number = GCE_GATE_HARMONIC_BAR_TARGET
): GceGateResult {
  const chords = buildChordsForGceGate(score, context, harmonicBarTarget);
  const sections = gceSectionsFromFormMap(context.form);
  return scoreResultForGce(score, chords, sections, context.generationMetadata?.songwriterStyleId);
}
