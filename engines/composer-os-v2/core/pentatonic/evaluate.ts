/**
 * Pentatonic evaluator 1.0.
 * Scores are heuristics in the range 0–1. They are not probabilities or confidence.
 *
 * A component is omitted when its evidence is absent. Omitted components do not
 * add weight and do not count as zero. The total is the weighted mean of the
 * components that were actually evaluated.
 *
 * Weights (default):
 *   melody 1.8, bass 1.2, harmony 1.8, held 1.0, target 1.0,
 *   caution 0.8, continuity 1.0, purpose 0.8, colour 0.7
 *
 * Melody / bass / harmony / held / target = shared pitch classes / evidence pitch classes.
 * Caution = 1 − (caution pitch classes inside the candidate / caution pitch classes).
 * Continuity = Jaccard similarity with the current collection.
 *   Omitted when no current collection exists.
 *   Omitted when purpose is `continuity`, because that purpose already uses Jaccard.
 * Purpose and colour read named HOME-relationship tables in `relationshipScoring.ts`
 *   (`pentatonic-relationship-scoring-1.0`). They do not invent a relationship from the tonal centre.
 *
 * Minimum suitability default: 0.62.
 * Retention margin default: 0.10.
 * An alternative displaces the current collection only when its quantized score
 * exceeds the current score by more than the margin. An improvement equal to the
 * margin retains the current collection.
 */

import type { HomeRelationship } from './homeRelationships';
import { spellingForPc, type ParsedNote } from './pitch';
import {
  COLOUR_HOME_RELATIONSHIP_SCORES,
  homeRelationshipTableScore,
  PURPOSE_HOME_RELATIONSHIP_SCORES,
} from './relationshipScoring';
import type {
  ComponentScore,
  PentatonicColourTension,
  PentatonicPurpose,
  PentatonicRecommendation,
  PentatonicScoringConfig,
} from './types';
import type { GeneratedCandidate } from './candidates';
import type { PentatonicInterpretation } from './types';

export const PENTATONIC_EVALUATOR_VERSION = 'pentatonic-evaluator-1.0';
export const PENTATONIC_CONFIGURATION_ID = 'pentatonic-config-1.0';

export const DEFAULT_PENTATONIC_SCORING: PentatonicScoringConfig = {
  minimumSuitability: 0.62,
  retentionMargin: 0.1,
  weights: {
    melody: 1.8,
    bass: 1.2,
    harmony: 1.8,
    held: 1,
    target: 1,
    caution: 0.8,
    continuity: 1,
    purpose: 0.8,
    colour: 0.7,
  },
};

export interface EvaluationEvidence {
  melody: readonly number[];
  melodySpellings: readonly ParsedNote[];
  bass: readonly number[];
  harmony: readonly number[];
  harmonySymbol: string | null;
  held: readonly number[];
  target: readonly number[];
  caution: readonly number[];
  protected: readonly number[];
  strictMelody: boolean;
  purpose: PentatonicPurpose | null;
  colourTension: PentatonicColourTension | null;
  currentPitchSet: readonly number[] | null;
}

export interface EvaluatedCandidate {
  candidate: GeneratedCandidate;
  primary: PentatonicInterpretation;
  feasible: boolean;
  failureReasons: string[];
  totalScore: number;
  componentScores: ComponentScore[];
  recommendation: PentatonicRecommendation;
}

export function quantizeScore(score: number): number {
  return Math.round(score * 10000) / 10000;
}

const RELATION_ORDER = ['home', 'major', 'six_nine_suspended', 'major_7_colour', 'suspended'];

function coverage(need: readonly number[], have: readonly number[]): number | null {
  if (need.length === 0) return null;
  const set = new Set(have);
  const hits = need.filter((pc) => set.has(pc)).length;
  return hits / need.length;
}

function jaccard(a: readonly number[], b: readonly number[]): number {
  const left = new Set(a);
  const right = new Set(b);
  let intersection = 0;
  for (const pc of left) if (right.has(pc)) intersection += 1;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function purposeScore(purpose: PentatonicPurpose, relationshipId: string | null, current: readonly number[] | null, have: readonly number[]): number | null {
  if (purpose === 'continuity') {
    if (!current) return null;
    return jaccard(current, have);
  }
  return homeRelationshipTableScore(PURPOSE_HOME_RELATIONSHIP_SCORES[purpose], relationshipId);
}

function colourScore(colour: PentatonicColourTension, relationshipId: string | null): number {
  return homeRelationshipTableScore(COLOUR_HOME_RELATIONSHIP_SCORES[colour], relationshipId);
}

function choosePrimary(candidate: GeneratedCandidate): PentatonicInterpretation {
  const ranked = [...candidate.interpretations].sort((a, b) => {
    const aHome = a.homeRelationshipId ? RELATION_ORDER.indexOf(a.homeRelationshipId) : 99;
    const bHome = b.homeRelationshipId ? RELATION_ORDER.indexOf(b.homeRelationshipId) : 99;
    if (a.source === 'home' && b.source !== 'home') return -1;
    if (b.source === 'home' && a.source !== 'home') return 1;
    if (aHome !== bHome) return aHome - bHome;
    if (a.source === 'current' && b.source !== 'current') return -1;
    if (b.source === 'current' && a.source !== 'current') return 1;
    const archetype = a.archetypeId.localeCompare(b.archetypeId);
    if (archetype !== 0) return archetype;
    return a.referencePc - b.referencePc;
  });
  return ranked[0]!;
}

function musicalFunction(primary: PentatonicInterpretation): string {
  switch (primary.homeRelationshipId) {
    case 'home':
      return 'Home continuity';
    case 'major':
      return 'Major colour obtained by transposing the HOME collection';
    case 'six_nine_suspended':
      return '6/9 suspended colour';
    case 'major_7_colour':
      return 'Major 7 colour';
    case 'suspended':
      return 'Suspended colour';
    default:
      if (primary.archetypeId === 'unregistered') return 'Custom non-registry collection, compared only for retention';
      if (primary.archetypeId === 'major_pentatonic') return 'Tonal-centre major pentatonic';
      if (primary.archetypeId === 'minor_pentatonic') return 'Tonal-centre minor pentatonic';
      return 'Alternate five-note collection';
  }
}

function noteList(pcs: readonly number[], spellings: readonly ParsedNote[]): string {
  return pcs.map((pc) => spellingForPc(pc, spellings)).join(' ');
}

function hardFailures(candidate: GeneratedCandidate, evidence: EvaluationEvidence): string[] {
  const have = new Set(candidate.canonicalPitchSet);
  const reasons: string[] = [];
  if (evidence.protected.length > 0) {
    const missing = evidence.protected.filter((pc) => !have.has(pc));
    if (missing.length > 0) {
      reasons.push(`Protected notes missing: ${noteList(missing, evidence.melodySpellings)}.`);
    }
  }
  if (evidence.strictMelody && evidence.melody.length > 0) {
    const missing = evidence.melody.filter((pc) => !have.has(pc));
    if (missing.length > 0) {
      reasons.push(`Strict melody membership misses ${noteList(missing, evidence.melodySpellings)}.`);
    }
  }
  return reasons;
}

export function evaluateCandidate(
  candidate: GeneratedCandidate,
  evidence: EvaluationEvidence,
  scoring: PentatonicScoringConfig
): EvaluatedCandidate {
  const primary = choosePrimary(candidate);
  const have = candidate.canonicalPitchSet;
  const failureReasons = hardFailures(candidate, evidence);
  const components: ComponentScore[] = [];
  const push = (id: string, label: string, weight: number, score: number | null, detail: string) => {
    if (score === null) return;
    components.push({ id, label, weight, score: quantizeScore(score), evidence: detail });
  };

  const melodyHits = evidence.melody.filter((pc) => have.includes(pc));
  push(
    'melody',
    'Melody',
    scoring.weights.melody,
    coverage(evidence.melody, have),
    evidence.melody.length === 0
      ? ''
      : `Melody shares ${melodyHits.length}/${evidence.melody.length} notes (${noteList(melodyHits, evidence.melodySpellings) || 'none'}).`
  );
  const bassHits = evidence.bass.filter((pc) => have.includes(pc));
  push(
    'bass',
    'Bass',
    scoring.weights.bass,
    coverage(evidence.bass, have),
    evidence.bass.length === 0 ? '' : `Bass shares ${bassHits.length}/${evidence.bass.length} notes (${noteList(bassHits, evidence.melodySpellings) || 'none'}).`
  );
  const harmonyHits = evidence.harmony.filter((pc) => have.includes(pc));
  push(
    'harmony',
    'Harmony',
    scoring.weights.harmony,
    coverage(evidence.harmony, have),
    evidence.harmony.length === 0
      ? ''
      : `Harmony${evidence.harmonySymbol ? ` ${evidence.harmonySymbol}` : ''} shares ${harmonyHits.length}/${evidence.harmony.length} chord tones (${noteList(harmonyHits, evidence.melodySpellings) || 'none'}).`
  );
  const heldHits = evidence.held.filter((pc) => have.includes(pc));
  push(
    'held',
    'Held notes',
    scoring.weights.held,
    coverage(evidence.held, have),
    evidence.held.length === 0 ? '' : `Held notes share ${heldHits.length}/${evidence.held.length} (${noteList(heldHits, evidence.melodySpellings) || 'none'}).`
  );
  const targetHits = evidence.target.filter((pc) => have.includes(pc));
  push(
    'target',
    'Target notes',
    scoring.weights.target,
    coverage(evidence.target, have),
    evidence.target.length === 0
      ? ''
      : `Target notes share ${targetHits.length}/${evidence.target.length} (${noteList(targetHits, evidence.melodySpellings) || 'none'}).`
  );
  const cautionHits = evidence.caution.filter((pc) => have.includes(pc));
  const cautionCoverage = coverage(evidence.caution, have);
  push(
    'caution',
    'Caution notes',
    scoring.weights.caution,
    cautionCoverage === null ? null : 1 - cautionCoverage,
    evidence.caution.length === 0
      ? ''
      : cautionHits.length === 0
        ? 'No caution notes sit inside this collection.'
        : `Caution notes inside the collection: ${noteList(cautionHits, evidence.melodySpellings)}.`
  );

  const continuityActive = evidence.currentPitchSet !== null && evidence.purpose !== 'continuity';
  push(
    'continuity',
    'Continuity',
    scoring.weights.continuity,
    continuityActive && evidence.currentPitchSet ? jaccard(evidence.currentPitchSet, have) : null,
    continuityActive && evidence.currentPitchSet
      ? `Shares ${have.filter((pc) => evidence.currentPitchSet!.includes(pc)).length} pitch classes with the current collection.`
      : ''
  );

  if (evidence.purpose) {
    const score = purposeScore(evidence.purpose, primary.homeRelationshipId, evidence.currentPitchSet, have);
    push(
      'purpose',
      'Purpose',
      scoring.weights.purpose,
      score,
      score === null
        ? ''
        : evidence.purpose === 'continuity'
          ? 'Purpose asks for continuity with the current collection.'
          : `Purpose ${evidence.purpose.replace(/_/g, ' ')} read from ${primary.homeRelationshipLabel ?? 'no HOME relationship'}.`
    );
  }
  if (evidence.colourTension) {
    push(
      'colour',
      'Colour / tension',
      scoring.weights.colour,
      colourScore(evidence.colourTension, primary.homeRelationshipId),
      `Colour preference ${evidence.colourTension.replace(/_/g, ' ')} read from ${primary.homeRelationshipLabel ?? 'no HOME relationship'}.`
    );
  }

  const weightSum = components.reduce((sum, component) => sum + component.weight, 0);
  const totalScore =
    weightSum === 0 ? 0 : quantizeScore(components.reduce((sum, component) => sum + component.score * component.weight, 0) / weightSum);

  const commonTonePcs = [...new Set([...evidence.melody, ...evidence.bass, ...evidence.harmony, ...evidence.held, ...evidence.target])].filter((pc) =>
    have.includes(pc)
  );
  commonTonePcs.sort((a, b) => a - b);
  const explanationParts = [
    primary.homeRelationshipLabel ? `${primary.homeRelationshipLabel} relative to the HOME collection.` : '',
    ...components.map((component) => component.evidence),
  ].filter((part) => part.length > 0);

  const recommendation: PentatonicRecommendation = {
    canonicalPitchSet: have,
    canonicalId: candidate.canonicalId,
    transposedName: primary.transposedName,
    displaySpelling: primary.displaySpelling,
    archetypeId: primary.archetypeId,
    archetypeDisplayName: primary.archetypeDisplayName,
    musicalFunction: musicalFunction(primary),
    homeRelationshipId: primary.homeRelationshipId,
    homeRelationshipLabel: primary.homeRelationshipLabel,
    alternativeInterpretations: candidate.interpretations.filter(
      (item) => item.transposedName !== primary.transposedName || item.homeRelationshipId !== primary.homeRelationshipId || item.archetypeId !== primary.archetypeId
    ),
    totalScore,
    componentScores: components,
    commonTones: commonTonePcs.map((pc) => spellingForPc(pc, evidence.melodySpellings)),
    cautions: cautionHits.map((pc) => spellingForPc(pc, evidence.melodySpellings)),
    constraintStatus: {
      protectedNotes: evidence.protected.length > 0 ? 'pass' : 'not_applicable',
      strictMelody: evidence.strictMelody && evidence.melody.length > 0 ? 'pass' : 'not_applicable',
    },
    explanation: explanationParts.join(' '),
    isCurrent: candidate.isCurrent,
    isPinned: candidate.isPinned,
    collectionKind: candidate.collectionKind,
  };

  return {
    candidate,
    primary,
    feasible: failureReasons.length === 0,
    failureReasons,
    totalScore,
    componentScores: components,
    recommendation,
  };
}

export function compareEvaluated(a: EvaluatedCandidate, b: EvaluatedCandidate): number {
  if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;
  const aRel = a.primary.homeRelationshipId ? RELATION_ORDER.indexOf(a.primary.homeRelationshipId) : 99;
  const bRel = b.primary.homeRelationshipId ? RELATION_ORDER.indexOf(b.primary.homeRelationshipId) : 99;
  if (aRel !== bRel) return aRel - bRel;
  const archetype = a.primary.archetypeId.localeCompare(b.primary.archetypeId);
  if (archetype !== 0) return archetype;
  return a.candidate.canonicalId.localeCompare(b.candidate.canonicalId);
}

export function scoringIsDefault(scoring: PentatonicScoringConfig): boolean {
  return JSON.stringify(scoring) === JSON.stringify(DEFAULT_PENTATONIC_SCORING);
}

export function configurationIdFor(scoring: PentatonicScoringConfig): string {
  if (scoringIsDefault(scoring)) return PENTATONIC_CONFIGURATION_ID;
  return `${PENTATONIC_CONFIGURATION_ID}:custom:${JSON.stringify(scoring)}`;
}

export type { HomeRelationship };
