import type { MusicContext } from '../music-context/musicContextTypes';

export type PentatonicDisposition =
  | 'INSUFFICIENT_CONTEXT'
  | 'NO_FEASIBLE_CANDIDATE'
  | 'RETAIN_CURRENT'
  | 'NO_PENTATONIC_INTERVENTION'
  | 'RECOMMEND';

export type PentatonicPurpose = 'lyrical_answer' | 'continuity' | 'colour' | 'tension' | 'restraint';

export type PentatonicColourTension = 'home' | 'suspended' | 'major_7' | 'brighter';

export type PentatonicDepth = 'near' | 'home_wheel' | 'chromatic';

export type EvidencePresence = 'missing' | 'empty' | 'used' | 'ambiguous' | 'malformed';

export interface PentatonicCollectionSpec {
  archetypeId?: string;
  referenceNote?: string;
  notes?: readonly string[];
}

export interface PentatonicScoringConfig {
  minimumSuitability: number;
  retentionMargin: number;
  weights: {
    melody: number;
    bass: number;
    harmony: number;
    held: number;
    target: number;
    caution: number;
    continuity: number;
    purpose: number;
    colour: number;
    /**
     * Chromatic friction. Colour/tension cost, not an avoid-note rule.
     * Score is 1 − (friction duration / eligible melody+bass duration).
     */
    friction: number;
  };
}

export interface PentatonicRecommendOptions {
  /** HOME collection. Never inferred from MusicContext.key. */
  home?: PentatonicCollectionSpec | null;
  /** Resource currently in use. Evaluated with the same scorer as alternatives. */
  current?: PentatonicCollectionSpec | null;
  /**
   * Explicit melody spellings.
   * Undefined: fall back to MusicContext.motif.seedPitches when present.
   * Empty array: melody evidence is explicitly empty. Motif is not consulted.
   */
  melodyNotes?: readonly string[];
  bassNotes?: readonly string[];
  heldNotes?: readonly string[];
  targetNotes?: readonly string[];
  protectedNotes?: readonly string[];
  cautionNotes?: readonly string[];
  purpose?: PentatonicPurpose;
  colourTension?: PentatonicColourTension;
  depth?: PentatonicDepth;
  strictMelodyMembership?: boolean;
  pinned?: readonly PentatonicCollectionSpec[];
  /**
   * Replaces MusicContext.key for this call only.
   * Does not write back to the context object.
   */
  tonalCentreOverride?: { root: string; mode?: 'major' | 'minor' };
  scoring?: Partial<Omit<PentatonicScoringConfig, 'weights'>> & {
    weights?: Partial<PentatonicScoringConfig['weights']>;
  };
}

export interface PentatonicRegionInput {
  tonalCentre: { root: string; mode: 'major' | 'minor' };
  harmonyBars?: readonly string[];
  home?: PentatonicCollectionSpec | null;
  current?: PentatonicCollectionSpec | null;
  melodyNotes?: readonly string[];
  bassNotes?: readonly string[];
  heldNotes?: readonly string[];
  targetNotes?: readonly string[];
  protectedNotes?: readonly string[];
  cautionNotes?: readonly string[];
  purpose?: PentatonicPurpose;
  colourTension?: PentatonicColourTension;
  depth?: PentatonicDepth;
  strictMelodyMembership?: boolean;
  pinned?: readonly PentatonicCollectionSpec[];
  scoring?: PentatonicRecommendOptions['scoring'];
}

export interface PentatonicInterpretation {
  archetypeId: string;
  archetypeDisplayName: string;
  referenceNote: string;
  referencePc: number;
  transposedName: string;
  displaySpelling: readonly string[];
  homeRelationshipId: string | null;
  homeRelationshipLabel: string | null;
  homeOffset: number | null;
  aliases: readonly string[];
  source: 'registry' | 'home' | 'current' | 'pinned';
}

export interface ComponentScore {
  id: string;
  label: string;
  weight: number;
  /** Heuristic 0–1. Not a probability. */
  score: number;
  evidence: string;
}

export interface PentatonicRecommendation {
  canonicalPitchSet: readonly number[];
  canonicalId: string;
  transposedName: string;
  displaySpelling: readonly string[];
  archetypeId: string;
  archetypeDisplayName: string;
  musicalFunction: string;
  homeRelationshipId: string | null;
  homeRelationshipLabel: string | null;
  alternativeInterpretations: readonly PentatonicInterpretation[];
  totalScore: number;
  componentScores: readonly ComponentScore[];
  commonTones: readonly string[];
  cautions: readonly string[];
  constraintStatus: {
    protectedNotes: 'pass' | 'not_applicable';
    strictMelody: 'pass' | 'not_applicable';
  };
  explanation: string;
  isCurrent: boolean;
  isPinned: boolean;
  /**
   * `custom_non_registry` is only a current or pinned five-note set that matches no registry transposition.
   * It is not a registry archetype.
   */
  collectionKind: 'registry' | 'custom_non_registry';
}

export interface RetentionReport {
  currentScore: number;
  bestAlternativeScore: number | null;
  requiredImprovementMargin: number;
  actualImprovement: number | null;
  comparisonRule: string;
}

export interface ConstraintFailure {
  canonicalId: string;
  name: string;
  reasons: readonly string[];
}

export interface PentatonicDiagnostics {
  temporalLimit: string;
  evaluated: {
    tonalCentre: { root: string; mode: 'major' | 'minor'; pitchClass: number };
    home: { archetypeId: string; referenceNote: string; pitchClass: number } | null;
    harmony: { presence: EvidencePresence; symbol: string | null; pitchClasses: readonly number[]; barCount: number };
    melody: { presence: EvidencePresence; pitchClasses: readonly number[]; order: readonly string[] };
    bass: { presence: EvidencePresence; pitchClasses: readonly number[] };
    held: { presence: EvidencePresence; pitchClasses: readonly number[] };
    target: { presence: EvidencePresence; pitchClasses: readonly number[] };
    caution: { presence: EvidencePresence; pitchClasses: readonly number[] };
    protected: { presence: EvidencePresence; pitchClasses: readonly number[] };
  };
  ignoredMusicContextFields: readonly string[];
  candidatePoolSize: number;
  evaluatedCandidateIds: readonly string[];
  currentIncludedOutsideDepth: boolean;
  /** Absent when no current collection was supplied. */
  currentCollectionKind: 'registry' | 'custom_non_registry' | null;
  fieldPrecedence: string;
}

export interface PentatonicEngineResult {
  kind: 'validation' | 'analysis';
  validationErrors: readonly string[];
  disposition: PentatonicDisposition | null;
  explanation: string;
  recommendations: readonly PentatonicRecommendation[];
  alternatives: readonly PentatonicRecommendation[];
  retained: PentatonicRecommendation | null;
  retention: RetentionReport | null;
  limitations: readonly string[];
  constraintFailures: readonly ConstraintFailure[];
  diagnostics: PentatonicDiagnostics | null;
  registryVersion: string;
  evaluatorVersion: string;
  relationshipScoringVersion: string;
  configurationId: string;
}

export type { MusicContext };
