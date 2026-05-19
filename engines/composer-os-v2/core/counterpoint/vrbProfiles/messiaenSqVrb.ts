/**
 * Olivier Messiaen SQ VRB — pitch-field spine (σ = 22).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type { IntervalWeight } from '../../harmony/pitchFieldSpineTypes';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';
import { MESSIAEN_SQ_VRF_FINGERPRINT_RECEIPTS } from './messiaenSqVrbFingerprints';

export const MESSIAEN_SQ_INTERVAL_POOL: IntervalWeight[] = [
  { semitones: 1, weight: 0.85 },
  { semitones: 2, weight: 0.95 },
  { semitones: 3, weight: 0.8 },
  { semitones: 4, weight: 0.7 },
  { semitones: 5, weight: 0.55 },
  { semitones: 6, weight: 0.9 },
  { semitones: 7, weight: 0.4 },
  { semitones: 8, weight: 0.35 },
  { semitones: 9, weight: 0.3 },
  { semitones: 10, weight: 0.25 },
  { semitones: 11, weight: 0.2 },
];

export const MESSIAEN_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'octatonic_whole_half',
  'octatonic_half_whole',
  'whole_tone_chord',
  'added_ninth',
  'parallel_planing',
  'unresolved_dominant',
  'modal_tonic_triad',
  'chromatic_cluster',
] as const;

export const MESSIAEN_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 22,
  motifRecurrenceWeight: 0.28,
  intervalEconomyWeight: 0.12,
  registerCohesionWeight: 0.18,
  phraseCellBarsMin: 1,
  phraseCellBarsMax: 8,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.06,
  phraseGrammarMode: 'non_resolving',
  motifRecurrenceHardFailMin: 0.22,
  authenticCadencePenalty: 0.9,
  dominantResolutionPenalty: 0.9,
  inconclusiveEndingCredit: 0.4,
  modalCadenceCredit: 0.45,
  bassPedalCredit: 0.85,
  pitchFieldCoherenceCredit: 0.86,
  addedNinthCredit: 0.55,
  coloristicHarmonyCredit: 0.8,
  wallToWallPhrasePenalty: 0.04,
};

export const MESSIAEN_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'messiaen',
  independenceLevel: 'moderate',
  imitationStyle: 'staggered_entry',
  registerPolicy: 'mid_register_chromatic_inner_compression',
  phraseArticulation: 'non_resolving',
  parallelMotionPolicy: 'allow',
  leapPolicy: 'structural_only',
  preferredIntervals: [1, 2, 3, 4, 6],
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: false,
    resolveByStep: false,
  },
  preferredImitationTypes: ['free', 'strict'],
  rhythmicIndependenceRequired: true,
  lineRoleAssignment: 'dynamic',
};

export const MESSIAEN_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'messiaen',
  harmonicSubstrate: 'pitch-field-spine',
  pitchFieldOptions: {
    defaultOverlapPolicy: 'shared-parent',
    fieldRhythmUnit: 'bar',
    useChordFallbackForCadences: false,
  },
  contrapuntalLinePolicy: MESSIAEN_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: MESSIAEN_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: MESSIAEN_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB pitch-field profile onto the Messiaen VoiceRuleBundle row. */
export function applyMessiaenSqVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = MESSIAEN_SQ_VRB_PROFILE;
  return {
    ...bundle,
    contrapuntalLinePolicy: p.contrapuntalLinePolicy,
    bestBbStyle: p.bestBbStyle,
    secondaryBbStyle: p.secondaryBbStyle,
    cautionBbStyle: p.cautionBbStyle,
    sqChordVocabulary: [...p.chordVocabulary],
    sqVrbProfileId: p.vrbId,
    pitchFieldGoverned: true,
    suppressFunctionalResolution: true,
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'angular',
      maxLeapSemitones: 5,
      preferredIntervalSets: [1, 2, 3, 4, 6],
    },
    orchestrationPolicy: {
      ...bundle.orchestrationPolicy,
      fingerprintReceipts: [
        ...(bundle.orchestrationPolicy.fingerprintReceipts ?? []),
        ...MESSIAEN_SQ_VRF_FINGERPRINT_RECEIPTS,
      ],
    },
    harmonicRhythm: {
      ...bundle.harmonicRhythm,
      minChordDurationBars: 1,
      maxChordDurationBars: 8,
      allowMidBarChange: false,
    },
    bassPolicy: {
      ...bundle.bassPolicy,
      role: 'pedal-or-drone',
      allowOctaveDoubling: false,
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 12,
      maxSpreadSemitones: 36,
      clusterSizeNotes: [4, 10],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    formPolicy: {
      ...bundle.formPolicy,
      narrativeArc: 'free',
      sectionRecallEnforced: true,
    },
    repairPolicy: {
      ...bundle.repairPolicy,
      resolveParallels: false,
    },
  };
}
