/**
 * Premium-melody pitch layer types (V87 design gate §3, §4).
 */

export type PremiumMelodyMetricalStrength = 'strong' | 'medium' | 'weak';

export type PremiumMelodyDurationBucket =
  | 'staccato'
  | 'eighth'
  | 'quarter'
  | 'half'
  | 'long'
  | 'rest_gap';

export type PremiumMelodySlotAccentKind =
  | 'none'
  | 'structural'
  | 'syncopated'
  | 'cadential';

export type PremiumMelodyPhrasePositionKind =
  | 'phrase_start'
  | 'phrase_interior'
  | 'phrase_peak'
  | 'phrase_cadence'
  | 'phrase_rest';

export type PremiumMelodyTieState = 'none' | 'tie_start' | 'tie_continue' | 'tie_end';

export type PremiumMelodyNoteRoleKind =
  | 'anchor'
  | 'passing'
  | 'neighbor'
  | 'appoggiatura_target'
  | 'rest_placeholder';

export type PremiumMelodyPitchSlotId = string & { readonly __brand: 'PremiumMelodyPitchSlotId' };

export interface PremiumMelodyPitchSlotContext {
  slotId: PremiumMelodyPitchSlotId;
  slotIndex: number;
  bar: number;
  onsetBeat: number;
  durationBeats: number;
  metricalStrength: PremiumMelodyMetricalStrength;
  durationBucket: PremiumMelodyDurationBucket;
  accent: PremiumMelodySlotAccentKind;
  phrasePosition: PremiumMelodyPhrasePositionKind;
  tieState: PremiumMelodyTieState;
  noteRole: PremiumMelodyNoteRoleKind;
  harmonyChordSymbol: string;
  harmonyRootPc: number;
  tonalCenterPc: number;
  registerBandMinMidi: number;
  registerBandMaxMidi: number;
  contourTargetDelta: number;
  cadenceTargetPc: number | null;
  /** Import pitch — stable slotId tie-break; not rescored mid-pass. */
  importMidiPitch: number;
  /** V2 opt-in — primary guide-tone pitch class per slot. */
  guideTonePc?: number;
  /** V2 opt-in — secondary guide-tone (6/9/13). */
  secondaryGuideTonePc?: number;
  /** V2 opt-in — climax-arc ideal MIDI for phrase-arc scoring. */
  idealPitchMidi?: number;
  /** V2 opt-in — phrase-local climax slot index. */
  climaxSlotIndex?: number;
  /** V2 opt-in — chord-boundary approach target slot. */
  isApproachTarget?: boolean;
  /** V2 opt-in — deferred approach intermediate before target. */
  approachWindowRole?: 'none' | 'intermediate' | 'target';
  approachTargetSlotIndex?: number;
  /** Semitone offset from target MIDI for approach intermediate. */
  approachPatternOffsetSemitones?: number;
  /** Chord boundary slot (harmony change). */
  isChordBoundary?: boolean;
}

export type PremiumMelodyPitchSlotList = readonly PremiumMelodyPitchSlotContext[];

export type PremiumMelodyContourArc =
  | 'arch'
  | 'ascending'
  | 'wave'
  | 'modal_float'
  | 'angular';

export type PremiumMelodyTonalCenterMode =
  | 'chord_root'
  | 'chord_third'
  | 'mode_tonic'
  | 'pedal_pc';

export interface PremiumMelodyPhrasePlannerConfig {
  contourArc: PremiumMelodyContourArc;
  registerMinMidi: number;
  registerMaxMidi: number;
  cadenceResolutionPc: number;
  tonalCenterMode: PremiumMelodyTonalCenterMode;
  phraseBreakSource: 'premium_melody_phrase';
}

export type PremiumMelodyIntervalWeightTable = Partial<
  Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, number>
>;

export interface PremiumMelodyChordFitVector {
  root: number;
  third: number;
  fifth: number;
  seventh: number;
  ninth: number;
  eleventh: number;
  thirteenth: number;
  extension: number;
  avoid: number;
  /** Optional — major-6th colour (not mapped to another role). */
  sixth?: number;
}

export interface PremiumMelodyGuideToneConfig {
  enabled: true;
  /** Gaussian sigma for guide-tone proximity (default 2.0 semitones). */
  proximitySigma?: number;
  /** Exact guide-tone hit multiplier — primary line (default 1.5). */
  hitBonusPrimary?: number;
  /** Exact guide-tone hit multiplier — secondary colour (default 1.3). */
  hitBonusSecondary?: number;
  /** Hard cap — max fraction of notes exactly on guide tone per bar (e.g. 0.70). */
  maxExactHitRatePerBar?: number;
  /** Per-bar floor — min fraction exactly on guide tone (e.g. 0.50 = one hit on a 2-note bar). */
  minExactHitRatePerBar?: number;
  /** Phrase-level exact guide-tone hit band (e.g. 0.60–0.70 on 2-note bars via mixed 50%/100% bars). */
  targetGlobalExactHitRateMin?: number;
  targetGlobalExactHitRateMax?: number;
  barPrimaryGuideTonePc?: Readonly<Record<number, number>>;
}

export interface PremiumMelodyClimaxArcConfig {
  enabled: true;
  /** Max leap semitones into climax neighbourhood (default 5). */
  climaxMaxLeapSemitones?: number;
  /** Bias climax pick toward 9th/13th within colourToneProximitySemitones of guide track. */
  colorToneBiasEnabled?: boolean;
  /** Semitone window for climax colour-tone bias (default 2). */
  colorToneProximitySemitones?: number;
}

export interface PremiumMelodyApproachPatternConfig {
  enabled: true;
}

export interface PremiumMelodySlotScorerConfig {
  weightInterval: number;
  weightPrevInterval: number;
  weightChordFit: number;
  weightMetric: number;
  weightRange: number;
  weightContour: number;
  weightComposerRules: number;
  intervalPreference: PremiumMelodyIntervalWeightTable;
  chordFitVector: PremiumMelodyChordFitVector;
  leapRecoveryBars: number;
  maxLeapSemitones: number;
  temperature: number;
  /** V2 opt-in — guide-tone Gaussian proximity weight. */
  weightGuideToneProximity?: number;
  /** V2 opt-in — phrase climax-arc Gaussian weight. */
  weightPhraseArc?: number;
  /** V2 opt-in — local stepwise contour (replaces weightContour when set). */
  localContourWeight?: number;
  /** V2 opt-in — BE functional harmony chord-fit vector. */
  chordFitVectorFunctional?: PremiumMelodyChordFitVector;
  /** V2 opt-in — BE tonic-major chord-fit vector. */
  chordFitVectorTonicMajor?: PremiumMelodyChordFitVector;
  /** V2 opt-in — rate of approach windows at chord boundaries. */
  approachPatternRate?: number;
}

export interface PremiumMelodySurfaceRulesConfig {
  approachSemitones: number[];
  enclosureEnabled: boolean;
  bluesInflectionRate: number;
  graceNoteRate: number;
  bendTagRate: number;
}

export type PremiumMelodySignatureRuleId = string & { readonly __brand: 'PremiumMelodySignatureRuleId' };

export interface PremiumMelodyPitchProfile {
  id: string;
  /** XOR salt for slot RNG — must be >= 1 when pitch layer enabled. */
  pitchSeedSalt: number;
  phrasePlanner: PremiumMelodyPhrasePlannerConfig;
  slotScorer: PremiumMelodySlotScorerConfig;
  surfaceRules: PremiumMelodySurfaceRulesConfig | null;
  signatureRules: PremiumMelodySignatureRuleId[];
  /** V2 opt-in phrase pre-pass blocks — absent => zero extra RNG / scoring. */
  guideTone?: PremiumMelodyGuideToneConfig;
  climaxArc?: PremiumMelodyClimaxArcConfig;
  approachPattern?: PremiumMelodyApproachPatternConfig;
}

export interface PremiumMelodyPitchTraceEvent {
  slotId: PremiumMelodyPitchSlotId;
  slotIndex: number;
  chosenMidiPitch: number;
  candidateCount: number;
  topScore: number;
  chosenRank: number;
  phrasePlanRef: string;
}

/** Surface-pass annotation tags — do not alter timing or event count. */
export interface PremiumMelodyPitchOrnamentAnnotations {
  approachSemitones?: number;
  enclosure?: boolean;
  bluesInflection?: boolean;
  graceNote?: boolean;
  bendTag?: boolean;
}

export type PremiumMelodySurfaceOrnamentKind =
  | 'approach'
  | 'enclosure'
  | 'blues'
  | 'grace'
  | 'bend';

export const PREMIUM_MELODY_SURFACE_ORNAMENT_ORDER: readonly PremiumMelodySurfaceOrnamentKind[] = [
  'approach',
  'enclosure',
  'blues',
  'grace',
  'bend',
];

export function assertValidPremiumMelodyPitchProfile(pitchProfile: PremiumMelodyPitchProfile): void {
  if (!Number.isFinite(pitchProfile.pitchSeedSalt) || pitchProfile.pitchSeedSalt < 1) {
    throw new Error(
      `PremiumMelodyPitchProfile.pitchSeedSalt must be >= 1 when pitch layer enabled (got ${pitchProfile.pitchSeedSalt})`
    );
  }
}
