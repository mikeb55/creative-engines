/**
 * John Coltrane (late) SQ VRB — pitch-field spine (σ = 31).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type { IntervalWeight } from '../../harmony/pitchFieldSpineTypes';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';
import { COLTRANE_SQ_VRF_FINGERPRINT_RECEIPTS } from './coltraneSqVrbFingerprints';

export const COLTRANE_SQ_INTERVAL_POOL: IntervalWeight[] = [
  { semitones: 1, weight: 0.95 },
  { semitones: 2, weight: 1.0 },
  { semitones: 3, weight: 0.9 },
  { semitones: 4, weight: 0.7 },
  { semitones: 5, weight: 0.75 },
  { semitones: 6, weight: 0.8 },
  { semitones: 7, weight: 0.5 },
  { semitones: 8, weight: 0.4 },
  { semitones: 9, weight: 0.35 },
  { semitones: 10, weight: 0.3 },
  { semitones: 11, weight: 0.3 },
];

export const COLTRANE_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'modal_dorian',
  'modal_mixolydian',
  'pentatonic_cluster',
  'added_ninth',
  'parallel_planing',
  'unresolved_dominant',
  'modal_minor',
  'chromatic_cluster',
] as const;

export const COLTRANE_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 31,
  motifRecurrenceWeight: 0.42,
  intervalEconomyWeight: 0.16,
  registerCohesionWeight: 0.14,
  phraseCellBarsMin: 4,
  phraseCellBarsMax: 16,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.12,
  phraseGrammarMode: 'arch',
  motifRecurrenceHardFailMin: 0.3,
  authenticCadencePenalty: 0.88,
  dominantResolutionPenalty: 0.88,
  inconclusiveEndingCredit: 0.32,
  modalCadenceCredit: 0.35,
  bassPedalCredit: 0.82,
  pitchFieldCoherenceCredit: 0.88,
  ic1SaturationCredit: 0.75,
  registralExpansionCredit: 0.7,
  wallToWallPhrasePenalty: 0.06,
};

export const COLTRANE_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'coltrane',
  independenceLevel: 'moderate',
  imitationStyle: 'motivic_echo',
  registerPolicy: 'dramatically_volatile_wide_arc',
  phraseArticulation: 'arch',
  parallelMotionPolicy: 'restrict',
  leapPolicy: 'free',
  preferredIntervals: [1, 2, 3, 4, 5, 6],
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: false,
    parallelOctavesAllowed: false,
    resolveByStep: false,
  },
  preferredImitationTypes: ['free'],
  rhythmicIndependenceRequired: true,
  lineRoleAssignment: 'dynamic',
};

export const COLTRANE_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'coltrane',
  harmonicSubstrate: 'pitch-field-spine',
  pitchFieldOptions: {
    defaultOverlapPolicy: 'shared-parent',
    fieldRhythmUnit: 'bar',
    useChordFallbackForCadences: false,
  },
  contrapuntalLinePolicy: COLTRANE_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: COLTRANE_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'mingus',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: COLTRANE_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB pitch-field profile onto the Coltrane VoiceRuleBundle row. */
export function applyColtraneSqVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = COLTRANE_SQ_VRB_PROFILE;
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
      contour: 'pentatonic-cell',
      maxLeapSemitones: 10,
      preferredIntervalSets: [1, 2, 3, 4, 5, 6],
    },
    orchestrationPolicy: {
      ...bundle.orchestrationPolicy,
      fingerprintReceipts: [
        ...(bundle.orchestrationPolicy.fingerprintReceipts ?? []),
        ...COLTRANE_SQ_VRF_FINGERPRINT_RECEIPTS,
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
      role: 'pedal-or-drone',
      allowOctaveDoubling: false,
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 8,
      maxSpreadSemitones: 42,
      clusterSizeNotes: [3, 7],
      forbidParallelFifths: true,
      forbidOctaveDoubling: false,
    },
    formPolicy: {
      ...bundle.formPolicy,
      narrativeArc: 'free',
      sectionRecallEnforced: false,
    },
    repairPolicy: {
      ...bundle.repairPolicy,
      resolveParallels: true,
    },
  };
}
