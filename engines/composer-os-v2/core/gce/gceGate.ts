/**
 * GCE gate — weighted overall score aligned with `scripts/gceStyleEval.ts` pillars.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { CompositionContext } from '../compositionContext';
import { scoreModelToMelodicLine } from './scoreModelToMelodicLine';
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
  const melody = scoreModelToMelodicLine(score);

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
