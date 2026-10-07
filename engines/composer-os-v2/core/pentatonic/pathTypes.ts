import type { MusicContext } from '../music-context/musicContextTypes';
import type { PentatonicColourTension, PentatonicDepth, PentatonicPurpose, PentatonicCollectionSpec, PentatonicScoringConfig } from './types';
import type { PentatonicPathConfig } from './pathConfig';

export interface PentatonicPassageEvent {
  id: string;
  sourceLabel: string;
  chordSymbol?: string;
  melodyNotes?: readonly string[];
  bassNotes?: readonly string[];
  heldNotes?: readonly string[];
  targetNotes?: readonly string[];
  protectedNotes?: readonly string[];
  cautionNotes?: readonly string[];
  phraseBoundaryAfter?: boolean;
  /** Explicit rest. Intentional. Not missing evidence and not a penalty. */
  melodyRest?: boolean;
  /** Explicit rest. Intentional. Not missing evidence and not a penalty. */
  bassRest?: boolean;
  /** Optional duration in beats. Recorded. Not used as a path weight. */
  durationBeats?: number;
  /** Duration-weighted melody and bass attacks. Harmony and held notes stay out. */
  soundingAttacks?: readonly { role: 'melody' | 'bass'; spelling: string; durationBeats: number }[];
}

export interface PentatonicPassage {
  events: readonly PentatonicPassageEvent[];
  tonalCentre?: { root: string; mode: 'major' | 'minor' };
  home?: PentatonicCollectionSpec | null;
  current?: PentatonicCollectionSpec | null;
  purpose?: PentatonicPurpose;
  colourTension?: PentatonicColourTension;
  strictMelodyMembership?: boolean;
  depth?: PentatonicDepth;
  pinned?: readonly PentatonicCollectionSpec[];
  /**
   * `default` keeps Dev 1 evaluator weights plus the friction component.
   * `wwh-duo-1.1` raises melody and bass above mutable chord-symbol evidence.
   */
  evidenceProfile?: 'default' | 'wwh-duo-1.1' | 'wwh-duo-1.0';
}

export interface PentatonicPathOptions {
  scoring?: Partial<Omit<PentatonicScoringConfig, 'weights'>> & {
    weights?: Partial<PentatonicScoringConfig['weights']>;
  };
  path?: Partial<PentatonicPathConfig>;
  /** When false, NONE is not a legal state. Default true. */
  allowNone?: boolean;
  /**
   * Dev 3 whole-score adapter. Off unless the adapter sets it.
   * Does not change path-cost constants.
   */
  continueWithoutDistinctPcs?: boolean;
  /**
   * Dev 3.4. Whole-score path may run with no tonal centre.
   * Uses the absolute registry. Does not invent a centre or a HOME.
   * Does not change NONE.
   */
  allowAbsentTonalCentre?: boolean;
  /**
   * Dev 3.6 eligibility pass. Default true.
   * False runs the same DP and the same costs with no NONE exclusions.
   * Comparison only. It does not change a score.
   */
  noneEligibility?: boolean;
  /**
   * Dev 3.7 held-collection floor. Default true when NONE eligibility is on.
   * False keeps Dev 3.6 NONE eligibility and does not change a score.
   */
  heldCollectionFloor?: boolean;
}

export type PentatonicPathDisposition = 'INSUFFICIENT_CONTEXT' | 'NO_FEASIBLE_PATH' | 'PATH';

export interface PitchClassTransitionDetail {
  retainedPitchClasses: readonly string[];
  removedPitchClasses: readonly string[];
  introducedPitchClasses: readonly string[];
  /** Smallest pitch-class distances. Not actual note migration. */
  nearestPitchClassDisplacement: readonly { from: string; to: string; semitones: number }[];
}

export interface PentatonicPathEventDecision {
  eventId: string;
  sourceLabel: string;
  chosenId: string;
  chosenName: string;
  archetypeId: string | null;
  referenceNote: string | null;
  canonicalPitchSet: readonly number[] | null;
  canonicalId: string | null;
  displaySpelling: readonly string[];
  homeRelationshipId: string | null;
  homeRelationshipLabel: string | null;
  localScore: number | null;
  localMisfit: number;
  transitionCost: number;
  sharedPitchClasses: readonly string[];
  sharedToneContinuity: number;
  changeFlag: 'started' | 'retained' | 'changed';
  explanation: string;
  localBestId: string | null;
  localBestName: string | null;
  localBestScore: number | null;
  pitchClassTransition: PitchClassTransitionDetail | null;
}

export interface PentatonicPathSegment {
  firstSourceLabel: string;
  lastSourceLabel: string;
  eventIds: readonly string[];
  chosenId: string;
  chosenName: string;
  archetypeId: string | null;
  referenceNote: string | null;
  canonicalPitchSet: readonly number[] | null;
  displaySpelling: readonly string[];
  homeRelationshipId: string | null;
  homeRelationshipLabel: string | null;
  meanLocalFit: number | null;
  sharedPitchClassesWithPrevious: readonly string[];
  reason: string;
}

export interface PentatonicPathCostBreakdown {
  localMisfit: number;
  changeCost: number;
  commonToneDiscount: number;
  displacementDiscount: number;
  phraseBoundaryDiscount: number;
  distinctResourcePenalty: number;
  shortSegmentPenalty: number;
  finalHomeBonus: number;
  total: number;
}

export interface PentatonicPathSummary {
  eventIds: readonly string[];
  chosenIds: readonly string[];
  segments: readonly PentatonicPathSegment[];
  switchCount: number;
  distinctResources: number;
  noneEventCount: number;
  noneSegmentCount: number;
  totalCost: number;
  costBreakdown: PentatonicPathCostBreakdown;
  homeContinuity: number;
}

export interface PentatonicNoneEligibilityRejection {
  firstSourceLabel: string;
  lastSourceLabel: string;
  eventIds: readonly string[];
  collectionId: string;
  collectionName: string;
  meanSuitability: number;
  iteration: number;
}

export interface PentatonicNoneEligibilitySurvival {
  firstSourceLabel: string;
  lastSourceLabel: string;
  eventIds: readonly string[];
  bestCollectionId: string | null;
  bestCollectionName: string | null;
  meanSuitability: number | null;
}

export interface PentatonicHeldRunExclusion {
  firstSourceLabel: string;
  lastSourceLabel: string;
  eventIds: readonly string[];
  heldCollectionId: string;
  heldCollectionName: string;
  heldMean: number;
  alternativeId: string;
  alternativeName: string;
  alternativeMean: number;
  iteration: number;
  finalStateId: string;
  finalStateName: string;
}

export interface PentatonicSurvivingBelowFloorRun {
  firstSourceLabel: string;
  lastSourceLabel: string;
  eventIds: readonly string[];
  heldCollectionId: string;
  heldCollectionName: string;
  heldMean: number;
  bestAlternativeId: string | null;
  bestAlternativeName: string | null;
  bestAlternativeMean: number | null;
}

export interface PentatonicNoneEligibility {
  iterations: number;
  floor: number;
  rejected: readonly PentatonicNoneEligibilityRejection[];
  surviving: readonly PentatonicNoneEligibilitySurvival[];
  heldExclusions: readonly PentatonicHeldRunExclusion[];
  survivingBelowFloor: readonly PentatonicSurvivingBelowFloorRun[];
}

export interface PentatonicPathResult {
  kind: 'validation' | 'analysis';
  validationErrors: readonly string[];
  disposition: PentatonicPathDisposition | null;
  pathEngineVersion: string;
  configVersion: string;
  evaluatorVersion: string;
  registryVersion: string;
  relationshipScoringVersion: string;
  sourceEventCount: number;
  events: readonly PentatonicPathEventDecision[];
  segments: readonly PentatonicPathSegment[];
  switchCount: number;
  distinctResources: number;
  noneEventCount: number;
  noneSegmentCount: number;
  totalPathCost: number | null;
  costBreakdown: PentatonicPathCostBreakdown | null;
  bestStaticPathCost: number | null;
  bestStaticStateId: string | null;
  bestStaticStateName: string | null;
  alternatives: readonly PentatonicPathSummary[];
  diagnostics: readonly string[];
  limitations: readonly string[];
  explanation: string;
  noneEligibility: PentatonicNoneEligibility;
}

export const PENTATONIC_PATH_LIMITATIONS = [
  'Path scores are heuristics, not confidence and not probabilities.',
  'Shared-tone continuity is shared pitch classes divided by the larger collection. It is not voice-leading.',
  'Displacement discount uses nearest pitch-class distances. It does not migrate notes.',
  'A bass rest is intentional. It is not missing context and it is not a penalty.',
  'Silence (melody rest and bass rest) continues the previous state and does not start a new resource.',
  'Short regions use a penalty. There is no hard minimum length of 2.',
  'Path states are pitch-class sets of any size. Pentatonics are the resource supplied today.',
  'wwh-duo-1.1 is the While We\'re Here evidence profile. It does not change the other Dev 1 component weights.',
  'Chromatic friction is a colour/tension cost inside the evaluator. It is not an avoid-note rule.',
  'A genuine collection change costs at least half the base change cost. Discounts cannot make that change nearly free. NONE does not use that floor.',
  'NONE may govern a contiguous region only when no single registry collection has mean local suitability at or above the existing suitability floor on that exact region. Per-bar winners are not stitched together. Path costs are unchanged.',
  'A below-floor stretch is two or more sounding events on one registry collection, each under the suitability floor. That collection is ineligible there only when one other registry collection reaches the floor across that same stretch. Events at or above the floor break the stretch. One-event dips stay with the DP. Path costs are unchanged.',
  'Nearest pitch-class displacements are candidates only. Register and voice data are not present.',
  'Phrase-boundary discounts apply only where the caller set phraseBoundaryAfter.',
  'Dev 2 does not parse MusicXML, generate notes, transform motifs, or call Phrase Engine or GCE.',
] as const;

export type { MusicContext };
