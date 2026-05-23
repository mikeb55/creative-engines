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
  scoreEconomyAndFocusForEnsemble,
  scoreTensionAndReleaseForEnsemble,
  scoreCadentialClarity,
  scorePhraseGrammar,
  scoreArrangementAndOrchestrationForEnsemble,
  scoreThematicRecallPotential,
  gceSectionsFromFormMap,
  rhythmExpectationForVrb,
  scoreEcmSpaceAndSilence,
  scoreEcmFeelCategory,
  type EconomyFocusScoringOptions,
  type EcmBarRole,
  type GceStructureSection,
} from './gceAutoScorers';
import type { EcmScorePlans } from '../ecm/ecmChamberScoring';
import {
  FRANK_ZAPPA_STRUCTURAL_FINGERPRINT,
  isFrankZappaSongwriterId,
  scoreFrankZappaStructuralPillars,
  buildFrankZappaStructuralGateMelody,
} from './frankZappaStructuralFingerprint';
import { getFrankZappaBluesrockFerociousProfile } from '../slonimsky/slonimskyEngine';
import { resolveZappaStyleMode } from '../song-mode/frankZappaSlice';
import type { MelodicNote } from './gce_melody_eval';
import type { CategoryScore } from './gceAutoScorers';

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
  songwriterId?: string,
  economyOptions?: EconomyFocusScoringOptions,
): GceGateResult {
  const melody = scoreModelToMelodicLine(score, resolveMelodicPartId(score));

  const scores: Array<{ name: string; score: number; weight: number }> = [
    { name: 'Cadential Clarity', weight: 2, score: scoreCadentialClarity(melody, chords, sections).score },
    { name: 'Melodic Identity', weight: 2, score: scoreMelodicIdentity(melody, songwriterId).score },
    { name: 'Phrase Grammar', weight: 1, score: scorePhraseGrammar(melody).score },
    { name: 'Harmony & Language', weight: 1, score: scoreHarmonyAndLanguage(chords).score },
    { name: 'Rhythmic Identity', weight: 1, score: scoreRhythmicIdentity(melody).score },
    { name: 'Structure & Form', weight: 1, score: scoreStructureAndForm(score, chords, sections).score },
    { name: 'Arrangement & Orchestration', weight: 1, score: scoreArrangementAndOrchestrationForEnsemble(score).score },
    {
      name: 'Economy & Focus',
      weight: 1,
      score: scoreEconomyAndFocusForEnsemble(melody, sections, score, economyOptions).score,
    },
    { name: 'Tension & Release', weight: 1, score: scoreTensionAndReleaseForEnsemble(score, chords, melody).score },
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
  const piano = score.parts.find((p) => p.id === 'bb_piano');
  const sources = piano ? [piano] : score.parts;
  for (const p of sources) {
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

function ecmBarRolesFromContext(context: CompositionContext): EcmBarRole[] {
  const plan = context.generationMetadata?.ecmBarTexturePlan;
  if (!plan?.length) return [];
  return plan.map((row) => ({
    bar: row.bar,
    guitarRole: row.guitarRole,
    bassRole: row.bassRole,
  }));
}

/** ECM chamber — adds space/silence + feel pillars (weights 2 + 1.5) on top of standard gate. */
export function scoreEcmChamberResultForGce(
  score: ScoreModel,
  context: CompositionContext,
  harmonicBarTarget: number = GCE_GATE_HARMONIC_BAR_TARGET,
  plans: EcmScorePlans = {},
): GceGateResult {
  const chords = buildChordsForGceGate(score, context, harmonicBarTarget);
  const sections = gceSectionsFromFormMap(context.form);
  const melody = scoreModelToMelodicLine(score, resolveMelodicPartId(score));
  const songwriterId = context.generationMetadata?.songwriterStyleId ?? 'ecm_chamber';
  const rhythmExp = rhythmExpectationForVrb('ecm_chamber');
  const tb = Math.max(1, context.form.totalBars, maxMeasureIndexAcrossParts(score));
  const space = scoreEcmSpaceAndSilence(ecmBarRolesFromContext(context), tb, 'ecm_chamber', {
    phraseEdgeSpaceApplied: context.generationMetadata?.ecmPhraseEdgeSpaceApplied,
    vrbId: songwriterId,
  });
  const feel = scoreEcmFeelCategory(score, context, plans);

  const scores: Array<{ name: string; score: number; weight: number }> = [
    { name: 'Cadential Clarity', weight: 2, score: scoreCadentialClarity(melody, chords, sections).score },
    { name: 'Melodic Identity', weight: 2, score: scoreMelodicIdentity(melody, songwriterId).score },
    { name: 'Phrase Grammar', weight: 1, score: scorePhraseGrammar(melody).score },
    { name: 'Harmony & Language', weight: 1, score: scoreHarmonyAndLanguage(chords).score },
    { name: 'Rhythmic Identity', weight: 1, score: scoreRhythmicIdentity(melody, rhythmExp).score },
    { name: 'Structure & Form', weight: 1, score: scoreStructureAndForm(score, chords, sections).score },
    { name: 'Arrangement & Orchestration', weight: 1, score: scoreArrangementAndOrchestrationForEnsemble(score).score },
    {
      name: 'Economy & Focus',
      weight: 1,
      score: scoreEconomyAndFocusForEnsemble(melody, sections, score).score,
    },
    { name: 'Tension & Release', weight: 1, score: scoreTensionAndReleaseForEnsemble(score, chords, melody).score },
    { name: 'Thematic Recall Potential', weight: 1, score: scoreThematicRecallPotential(melody, sections).score },
    { name: 'ECM Space & Silence', weight: 2, score: space.score },
    { name: 'ECM Feel', weight: 1.5, score: feel.score },
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

function attacksPerBarFromMelody(melody: MelodicNote[]): number[] {
  const byBar = new Map<number, number>();
  for (const n of melody) {
    if (n.rest || n.midi <= 0) continue;
    byBar.set(n.bar, (byBar.get(n.bar) ?? 0) + 1);
  }
  if (byBar.size === 0) return [];
  const maxBar = Math.max(...byBar.keys());
  return Array.from({ length: maxBar }, (_, i) => byBar.get(i + 1) ?? 0);
}

/** Blues-rock ferocious pillars — Slonimsky map profile (replaces structural fingerprint scorers). */
function scoreFrankZappaBluesrockFerociousPillars(
  melody: MelodicNote[],
  sections: GceStructureSection[]
): Array<{ name: string; score: number; weight: number; justification: string }> {
  const profile = getFrankZappaBluesrockFerociousProfile();
  const attacks = attacksPerBarFromMelody(melody);
  const avg =
    attacks.length > 0 ? attacks.reduce((a, x) => a + x, 0) / attacks.length : 0;
  const densityOk =
    avg >= profile.noteDensityRange.min && avg <= profile.noteDensityRange.max;
  const density: CategoryScore = {
    score: densityOk ? 8.5 : avg < profile.noteDensityRange.min ? 6 : 5.5,
    justification: `Bluesrock density mean ${avg.toFixed(1)} target ${profile.noteDensityRange.min}-${profile.noteDensityRange.max}`,
  };

  const groupingLabels = profile.rhythmicGroupings.map(String).join('+');
  const rhythm: CategoryScore = {
    score: profile.rhythmicGroupings.length >= 3 ? 8 : 6,
    justification: `Bluesrock rhythmicGroupings ${groupingLabels}; chromaticBudget ${profile.chromaticBudget}`,
  };

  const rests = melody.filter((n) => n.rest).length;
  const restRatio = melody.length > 0 ? rests / melody.length : 0;
  const silence: CategoryScore = {
    score: profile.silencePolicy.restDensityLow
      ? restRatio <= 0.22
        ? 8
        : 6
      : 7,
    justification: `Bluesrock silencePolicy feedbackSustainAsRest=${profile.silencePolicy.feedbackSustainAsRest} hardCutAtSectionBoundary=${profile.silencePolicy.hardCutAtSectionBoundary}`,
  };

  void sections;
  return [
    { name: 'Zappa Bluesrock Note Density', weight: 2, score: density.score, justification: density.justification },
    { name: 'Zappa Bluesrock Rhythmic Groupings', weight: 1.5, score: rhythm.score, justification: rhythm.justification },
    { name: 'Zappa Bluesrock Silence Policy', weight: 1.5, score: silence.score, justification: silence.justification },
  ];
}

/** Frank Zappa — additive GCE structural pillars (slice + Slonimsky solo unchanged). */
export function scoreFrankZappaResultForGce(
  score: ScoreModel,
  context: CompositionContext,
  harmonicBarTarget: number = GCE_GATE_HARMONIC_BAR_TARGET
): GceGateResult {
  const chords = buildChordsForGceGate(score, context, harmonicBarTarget);
  const sections = gceSectionsFromFormMap(context.form);
  const melody = buildFrankZappaStructuralGateMelody(score);
  const zappaStyleMode = resolveZappaStyleMode(context);
  const songwriterId = context.generationMetadata?.songwriterStyleId ?? 'frank_zappa';
  const rhythmExp = rhythmExpectationForVrb('frank_zappa');

  const baseScores: Array<{ name: string; score: number; weight: number }> = [
    { name: 'Cadential Clarity', weight: 2, score: scoreCadentialClarity(melody, chords, sections).score },
    { name: 'Melodic Identity', weight: 2, score: scoreMelodicIdentity(melody, songwriterId).score },
    { name: 'Phrase Grammar', weight: 1, score: scorePhraseGrammar(melody).score },
    { name: 'Harmony & Language', weight: 1, score: scoreHarmonyAndLanguage(chords).score },
    { name: 'Rhythmic Identity', weight: 1, score: scoreRhythmicIdentity(melody, rhythmExp).score },
    { name: 'Structure & Form', weight: 1, score: scoreStructureAndForm(score, chords, sections).score },
    { name: 'Arrangement & Orchestration', weight: 1, score: scoreArrangementAndOrchestrationForEnsemble(score).score },
    {
      name: 'Economy & Focus',
      weight: 1,
      score: scoreEconomyAndFocusForEnsemble(melody, sections, score).score,
    },
    { name: 'Tension & Release', weight: 1, score: scoreTensionAndReleaseForEnsemble(score, chords, melody).score },
    { name: 'Thematic Recall Potential', weight: 1, score: scoreThematicRecallPotential(melody, sections).score },
  ];

  const zappaPillars =
    zappaStyleMode === 'compositional'
      ? scoreFrankZappaStructuralPillars({ score, context, chords, sections, melody }).filter((p) => p.weight > 0)
      : scoreFrankZappaBluesrockFerociousPillars(melody, sections).filter((p) => p.weight > 0);
  const scores = [
    ...baseScores,
    ...zappaPillars.map((p) => ({ name: p.name, score: p.score, weight: p.weight })),
  ];

  const totalWeight = scores.reduce((s, c) => s + c.weight, 0);
  const weightedSum = scores.reduce((s, c) => s + c.score * c.weight, 0);
  const overallScore = Math.round((weightedSum / totalWeight) * 10) / 10;
  const weakest = scores.reduce((a, b) => (a.score <= b.score ? a : b));
  void FRANK_ZAPPA_STRUCTURAL_FINGERPRINT;
  return {
    overallScore,
    weakestCategory: weakest.name,
    passed: overallScore >= GCE_GATE_MIN,
  };
}

export function scoreGoldenPathResultForGce(
  score: ScoreModel,
  context: CompositionContext,
  harmonicBarTarget: number = GCE_GATE_HARMONIC_BAR_TARGET
): GceGateResult {
  if (context.presetId === 'ecm_chamber') {
    return scoreEcmChamberResultForGce(score, context, harmonicBarTarget);
  }
  const songwriterId = context.generationMetadata?.songwriterStyleId;
  if (isFrankZappaSongwriterId(songwriterId)) {
    return scoreFrankZappaResultForGce(score, context, harmonicBarTarget);
  }
  const chords = buildChordsForGceGate(score, context, harmonicBarTarget);
  const sections = gceSectionsFromFormMap(context.form);
  return scoreResultForGce(score, chords, sections, songwriterId);
}
