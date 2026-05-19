/**
 * Ornette Coleman SQ VRB — pitch-field spine (σ = 33).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type { IntervalWeight } from '../../harmony/pitchFieldSpineTypes';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';
import { ORNETTE_SQ_VRF_FINGERPRINT_RECEIPTS } from './ornetteSqVrbFingerprints';

export const ORNETTE_SQ_INTERVAL_POOL: IntervalWeight[] = [
  { semitones: 1, weight: 0.9 },
  { semitones: 2, weight: 1.0 },
  { semitones: 3, weight: 0.85 },
  { semitones: 4, weight: 0.75 },
  { semitones: 5, weight: 0.8 },
  { semitones: 6, weight: 0.65 },
  { semitones: 7, weight: 0.6 },
  { semitones: 8, weight: 0.4 },
  { semitones: 9, weight: 0.4 },
  { semitones: 10, weight: 0.35 },
  { semitones: 11, weight: 0.35 },
];

export const ORNETTE_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'modal_dorian',
  'modal_mixolydian',
  'folk_modal',
  'pentatonic_cluster',
  'added_ninth',
  'parallel_planing',
  'unresolved_dominant',
  'modal_minor',
] as const;

export const ORNETTE_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 33,
  motifRecurrenceWeight: 0.4,
  intervalEconomyWeight: 0.14,
  registerCohesionWeight: 0.12,
  phraseCellBarsMin: 2,
  phraseCellBarsMax: 8,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.1,
  phraseGrammarMode: 'non_resolving',
  motifRecurrenceHardFailMin: 0.28,
  authenticCadencePenalty: 0.85,
  dominantResolutionPenalty: 0.85,
  inconclusiveEndingCredit: 0.35,
  modalCadenceCredit: 0.3,
  bluesInflectionCredit: 0.85,
  collectiveImprovCredit: 0.85,
  pitchFieldCoherenceCredit: 0.85,
  loopingCellPenalty: 0.05,
  wallToWallPhrasePenalty: 0.08,
};

export const ORNETTE_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'ornette_coleman',
  independenceLevel: 'high',
  imitationStyle: 'motivic_echo',
  registerPolicy: 'dramatically_volatile_wide_arc',
  phraseArticulation: 'non_resolving',
  parallelMotionPolicy: 'allow',
  leapPolicy: 'free',
  preferredIntervals: [1, 2, 3, 4, 5, 6, 7],
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: true,
    resolveByStep: false,
  },
  preferredImitationTypes: ['free'],
  rhythmicIndependenceRequired: true,
  lineRoleAssignment: 'dynamic',
};

export const ORNETTE_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'ornette_coleman',
  harmonicSubstrate: 'pitch-field-spine',
  pitchFieldOptions: {
    defaultOverlapPolicy: 'semi-independent',
    fieldRhythmUnit: 'phrase',
    useChordFallbackForCadences: false,
  },
  contrapuntalLinePolicy: ORNETTE_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: ORNETTE_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'mingus',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: ORNETTE_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB pitch-field profile onto the Ornette VoiceRuleBundle row. */
export function applyOrnetteVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = ORNETTE_SQ_VRB_PROFILE;
  return {
    ...bundle,
    contrapuntalLinePolicy: p.contrapuntalLinePolicy,
    bestBbStyle: p.bestBbStyle,
    secondaryBbStyle: p.secondaryBbStyle,
    cautionBbStyle: p.cautionBbStyle,
    sqChordVocabulary: [...p.chordVocabulary],
    sqVrbProfileId: p.vrbId,
    harmolodicsEnabled: true,
    pitchFieldGoverned: true,
    democraticEnsemble: true,
    collectiveImprovEnabled: true,
    bluesInflectionRequired: true,
    suppressFunctionalResolution: true,
    forbidAudibleProcessOperators: true,
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'blues-field-free',
      maxLeapSemitones: 12,
      preferredIntervalSets: [1, 2, 3, 4, 5],
    },
    orchestrationPolicy: {
      ...bundle.orchestrationPolicy,
      allowCollectiveImprov: true,
      fingerprintReceipts: [
        ...(bundle.orchestrationPolicy.fingerprintReceipts ?? []),
        ...ORNETTE_SQ_VRF_FINGERPRINT_RECEIPTS,
      ],
    },
    harmonicRhythm: {
      ...bundle.harmonicRhythm,
      minChordDurationBars: 0,
      maxChordDurationBars: 64,
      allowMidBarChange: false,
    },
    bassPolicy: {
      ...bundle.bassPolicy,
      role: 'melodic-floating',
      allowOctaveDoubling: false,
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 6,
      maxSpreadSemitones: 48,
      clusterSizeNotes: [2, 6],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    formPolicy: {
      ...bundle.formPolicy,
      narrativeArc: 'head-solos-head',
      sectionRecallEnforced: false,
    },
    repairPolicy: {
      ...bundle.repairPolicy,
      resolveParallels: false,
    },
  };
}
