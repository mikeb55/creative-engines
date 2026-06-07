export type Score01 = number;
export type Score10 = number;
export type PassFail = 'pass' | 'fail';
export type Severity = 'info' | 'warning' | 'error' | 'critical';
export type GceCategory =
  | 'cadentialClarity'
  | 'melodicIdentity'
  | 'phraseGrammar'
  | 'harmonyAndLanguage'
  | 'rhythmicIdentity'
  | 'structureAndForm'
  | 'arrangementAndOrchestration'
  | 'economyAndFocus'
  | 'tensionAndRelease'
  | 'thematicRecallPotential';
export interface GceCategoryScore {
  category: GceCategory;
  score: Score10;
  weight: number;
  weightedScore: number;
  confidence?: Score01;
  notes?: string[];
}
export type GceScoreMap = Record<GceCategory, GceCategoryScore>;
export interface GceWeights extends Record<GceCategory, number> {}
export interface GceEvaluationInput<
  TGeneratedOutput = unknown,
  TFeatures = unknown,
> {
  output: TGeneratedOutput;
  features: TFeatures;
  weights: GceWeights;
  /** Optional — e.g. `songwriterStyleId` for melodic GCE targets when `output` is a {@link ScoreModel}. */
  metadata?: Record<string, unknown>;
}
export interface GceEvaluationResult {
  categories: GceScoreMap;
  finalScore: Score10;
  weakestCategory: GceCategory;
  strongestCategory: GceCategory;
  pass: boolean;
  threshold: Score10;
  notes?: string[];
}
export type StyleFeatureValue =
  | number
  | string
  | boolean
  | number[]
  | string[]
  | Record<string, unknown>
  | null;
export interface ExtractedStyleFeatures {
  rhythmic?: Record<string, StyleFeatureValue>;
  /** Alias for {@link rhythmic} — legacy style profile field name. */
  rhythm?: Record<string, StyleFeatureValue>;
  melodic?: Record<string, StyleFeatureValue>;
  /** Alias for {@link melodic} — legacy style profile field name. */
  melody?: Record<string, StyleFeatureValue>;
  harmonic?: Record<string, StyleFeatureValue>;
  formal?: Record<string, StyleFeatureValue>;
  orchestration?: Record<string, StyleFeatureValue>;
  texture?: Record<string, StyleFeatureValue>;
  dynamics?: Record<string, StyleFeatureValue>;
  articulation?: Record<string, StyleFeatureValue>;
  production?: Record<string, StyleFeatureValue>;
  metadata?: Record<string, StyleFeatureValue>;
}
export interface FeatureExtractionInput<TGeneratedOutput = unknown> {
  output: TGeneratedOutput;
  sourceFormat:
    | 'musicxml'
    | 'midi'
    | 'scoreModel'
    | 'audioAnalysis'
    | 'custom';
  styleId?: string;
  metadata?: Record<string, unknown>;
}
export interface FeatureExtractor<TGeneratedOutput = unknown> {
  id: string;
  extract(
    input: FeatureExtractionInput<TGeneratedOutput>
  ): ExtractedStyleFeatures;
}
export interface StyleDimensionScore {
  id: string;
  /** Legacy alias for {@link id}. */
  dimensionId?: string;
  label?: string;
  score: Score10;
  weight: number;
  weightedScore?: number;
  targetDescription?: string;
  observedDescription?: string;
  confidence?: Score01;
}
export interface StyleProfileEvaluationInput<
  TGeneratedOutput = unknown,
  TFeatures extends ExtractedStyleFeatures = ExtractedStyleFeatures,
> {
  output: TGeneratedOutput;
  features: TFeatures;
  profile: StyleProfile<TGeneratedOutput, TFeatures>;
}
export interface StyleProfileEvaluationResult {
  styleId: string;
  styleName: string;
  dimensions: StyleDimensionScore[];
  finalStyleScore: Score10;
  weakestDimensionId: string;
  strongestDimensionId: string;
  pass: boolean;
  threshold: Score10;
  notes?: string[];
  /** Legacy alias for {@link styleId}. */
  composerId?: string;
  /** Legacy alias for {@link dimensions}. */
  dimensionScores?: StyleDimensionScore[];
  /** Legacy alias for {@link finalStyleScore}. */
  overallScore?: Score10;
  hardFails?: unknown[];
}
export interface StyleScoringContext<TGeneratedOutput = unknown> {
  output: TGeneratedOutput;
  features: ExtractedStyleFeatures;
  metadata?: Record<string, unknown>;
}
export type StyleScoringFunction<TGeneratedOutput = unknown> = (
  context: StyleScoringContext<TGeneratedOutput>
) => StyleProfileEvaluationResult;
export interface StyleProfile<
  TGeneratedOutput = unknown,
  TFeatures extends ExtractedStyleFeatures = ExtractedStyleFeatures,
> {
  id: string;
  name?: string;
  /** Legacy alias for {@link name}. */
  label?: string;
  family?:
    | 'bigBand'
    | 'jazz'
    | 'rock'
    | 'songwriter'
    | 'classical'
    | 'chamber'
    | 'film'
    | 'electronic'
    | 'experimental'
    | 'custom'
    | 'fusion'
    | 'ecmChamber';
  /** Legacy alias for {@link family}. */
  composerFamily?:
    | 'bigBand'
    | 'jazz'
    | 'rock'
    | 'songwriter'
    | 'classical'
    | 'chamber'
    | 'film'
    | 'electronic'
    | 'experimental'
    | 'custom'
    | 'fusion'
    | 'ecmChamber';
  description?: string;
  referenceArtists?: string[];
  requiredFeatures?: Array<keyof TFeatures | string>;
  dimensions: StyleDimensionDefinition[];
  threshold: Score10;
  score: (
    input: StyleProfileEvaluationInput<TGeneratedOutput, TFeatures>
  ) => StyleProfileEvaluationResult;
  /** Legacy alias for {@link score}. */
  evaluate?: (
    input: StyleProfileEvaluationInput<TGeneratedOutput, TFeatures>
  ) => StyleProfileEvaluationResult;
  /** Blended weight in `combinedEvaluator` (default 0.1). Bebop / Modern Jazz / classical / folk override. */
  quadratonicAlignmentWeight?: number;
}
export interface StyleDimensionDefinition {
  id: string;
  label: string;
  weight: number;
  targetRange?: { min?: number; max?: number; ideal?: number };
  description?: string;
  featureKeys?: string[];
}
export type LockGateId =
  | 'xmlValidity'
  | 'barDurationIntegrity'
  | 'meterIntegrity'
  | 'chordMelodyAlignment'
  | 'voiceLeadingIntegrity'
  | 'bassHarmonicIntegrity'
  | 'sectionContrast'
  | 'rhythmAntiLoop'
  | 'registerIntegrity'
  | 'instrumentRoleIntegrity'
  | 'protectedMaterialIntegrity'
  | 'exportValidation'
  | 'custom';
export interface LockGateInput<
  TGeneratedOutput = unknown,
  TFeatures = unknown,
> {
  output: TGeneratedOutput;
  features?: TFeatures;
  metadata?: Record<string, unknown>;
}
export interface LockGateResult {
  gateId: LockGateId | string;
  label: string;
  status: PassFail;
  severity: Severity;
  reason?: string;
  details?: Record<string, unknown>;
}
export interface LockGate<
  TGeneratedOutput = unknown,
  TFeatures = unknown,
> {
  id: LockGateId | string;
  label: string;
  severity: Severity;
  validate(
    input: LockGateInput<TGeneratedOutput, TFeatures>
  ): LockGateResult;
}
export interface LockEvaluationResult {
  status: PassFail;
  gates: LockGateResult[];
  failedGates: LockGateResult[];
  criticalFailures: LockGateResult[];
  pass: boolean;
}
export interface CandidateGenerationInput {
  prompt?: string;
  seed?: string | number;
  styleId?: string;
  constraints?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
export interface GeneratedCandidate<TGeneratedOutput = unknown> {
  id: string;
  output: TGeneratedOutput;
  seed?: string | number;
  generationMetadata?: Record<string, unknown>;
}
export interface CandidateScore {
  candidateId: string;
  gce: GceEvaluationResult;
  style: StyleProfileEvaluationResult;
  lock: LockEvaluationResult;
  combinedScore: Score10;
  pass: boolean;
  weakestDimension: string;
  refinementTarget?: RefinementTarget;
}
export interface RefinementTarget {
  dimensionId: string;
  dimensionType: 'gce' | 'style' | 'lock' | 'combined' | 'quadratonic';
  reason: string;
  suggestedAction?: string;
  severity?: Severity;
}
export interface CandidateGenerator<TGeneratedOutput = unknown> {
  generate(
    input: CandidateGenerationInput
  ): GeneratedCandidate<TGeneratedOutput>[];
}
export interface CandidateRefiner<TGeneratedOutput = unknown> {
  refine(
    candidate: GeneratedCandidate<TGeneratedOutput>,
    target: RefinementTarget
  ): GeneratedCandidate<TGeneratedOutput>;
}
export interface DcrProtocolConfig {
  candidateCount: number;
  allowSingleRefinementPass: boolean;
  targetScore: Score10;
  minimumGceScore: Score10;
  minimumStyleScore: Score10;
  requireLockPass: boolean;
}
export interface DcrProtocolInput<TGeneratedOutput = unknown> {
  generationInput: CandidateGenerationInput;
  generator: CandidateGenerator<TGeneratedOutput>;
  refiner: CandidateRefiner<TGeneratedOutput>;
  evaluator: CombinedEvaluator<TGeneratedOutput>;
  config: DcrProtocolConfig;
}
export interface DcrProtocolResult<TGeneratedOutput = unknown> {
  initialCandidates: GeneratedCandidate<TGeneratedOutput>[];
  initialScores: CandidateScore[];
  selectedCandidateBeforeRefinement: GeneratedCandidate<TGeneratedOutput>;
  selectedScoreBeforeRefinement: CandidateScore;
  refinedCandidate?: GeneratedCandidate<TGeneratedOutput>;
  refinedScore?: CandidateScore;
  finalCandidate: GeneratedCandidate<TGeneratedOutput>;
  finalScore: CandidateScore;
  refinementApplied: boolean;
  pass: boolean;
}
export interface CombinedEvaluatorConfig {
  gceWeight: number;
  styleWeight: number;
  lockRequired: boolean;
  passThreshold: Score10;
  /** When set, overrides profile/metadata quadratonic blend weight. */
  quadratonicAlignmentWeight?: number;
}
export interface CombinedEvaluationInput<TGeneratedOutput = unknown> {
  output: TGeneratedOutput;
  sourceFormat:
    | 'musicxml'
    | 'midi'
    | 'scoreModel'
    | 'audioAnalysis'
    | 'custom';
  styleProfile: StyleProfile<TGeneratedOutput>;
  featureExtractor: FeatureExtractor<TGeneratedOutput>;
  gceWeights: GceWeights;
  lockGates: Array<LockGate<TGeneratedOutput, ExtractedStyleFeatures>>;
  config: CombinedEvaluatorConfig;
  metadata?: Record<string, unknown>;
}
export interface CombinedEvaluationResult {
  features: ExtractedStyleFeatures;
  gce: GceEvaluationResult;
  style: StyleProfileEvaluationResult;
  lock: LockEvaluationResult;
  finalScore: Score10;
  weakestDimension: string;
  strongestDimension?: string;
  refinementTarget?: RefinementTarget;
  pass: boolean;
  reasons: string[];
  /** Tonality Vault quadratonic melody vs chord alignment (0–10), blended lightly into {@link finalScore}. */
  quadratonicAlignment?: { score: Score10; weight: number };
}
export interface CombinedEvaluator<TGeneratedOutput = unknown> {
  evaluate(
    input: CombinedEvaluationInput<TGeneratedOutput>
  ): CombinedEvaluationResult;
}
export interface EvaluatorRuntimeReport<TGeneratedOutput = unknown> {
  outputId?: string;
  styleId: string;
  styleName: string;
  finalScore: Score10;
  gceScore: Score10;
  styleScore: Score10;
  lockPass: boolean;
  pass: boolean;
  weakestDimension: string;
  refinementTarget?: RefinementTarget;
  candidate?: GeneratedCandidate<TGeneratedOutput>;
  timestampIso: string;
}

/** Canonical or legacy overall style score. */
export function readStyleScore(result: StyleProfileEvaluationResult): Score10 {
  return result.finalStyleScore ?? result.overallScore ?? 0;
}

export function readStylePass(result: StyleProfileEvaluationResult): boolean {
  return result.pass ?? false;
}

export function readProfileThreshold(profile: Pick<StyleProfile, 'threshold'>): Score10 {
  return profile.threshold ?? 7;
}

export function readProfileName(profile: Pick<StyleProfile, 'id' | 'name' | 'label'>): string {
  return profile.name ?? profile.label ?? profile.id;
}

export function dimensionWeightedScore(d: StyleDimensionScore): number {
  return d.weightedScore ?? d.score * (d.weight ?? 0);
}

export function dimensionIdOf(d: StyleDimensionScore): string {
  return d.id ?? d.dimensionId ?? '';
}
