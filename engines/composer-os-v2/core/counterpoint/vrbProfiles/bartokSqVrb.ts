/**
 * Béla Bartók SQ VRB — SQ→BB Harmonic Voice profile (σ = 29).
 * Chromatic clusters, folk-modal axis, tritone pairs, high line independence.
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const BARTOK_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'chromatic_cluster',
  'minor_second_stack',
  'tritone_pair',
  'modal_minor',
  'folk_modal',
  'lydian_mode_chord',
  'octatonic_chord',
] as const;

export const BARTOK_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 29,
  registerCohesionSoftCeilingSt: 31,
  motifRecurrenceWeight: 0.36,
  intervalEconomyWeight: 0.13,
  registerCohesionWeight: 0.22,
  phraseCellBarsMin: 1,
  phraseCellBarsMax: 6,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.1,
  phraseGrammarMode: 'arch',
  motifRecurrenceHardFailMin: 0.3,
  chromaticClusterCredit: 0.28,
  folkModalCredit: 0.28,
  tritoneCredit: 0.28,
  dissonanceToleranceCredit: 0.28,
  asymmetricRhythmCredit: 0.18,
  dominantResolutionPenalty: 0.28,
  authenticCadencePenalty: 0.28,
  authenticCadenceCredit: 0,
  modalEndingsValid: true,
  inconclusiveEndingCredit: 0.16,
  tritoneAxisCredit: 0.2,
  ic1SaturationCredit: 0.14,
  wallToWallPhrasePenalty: 0,
};

/** Bartók SQ — high independence; axis harmony; strict imitation grammar. */
export const BARTOK_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'bartok',
  independenceLevel: 'high',
  imitationStyle: 'strict_interval_cycle',
  registerPolicy: 'wide_registral_contrast',
  phraseArticulation: 'arch',
  parallelMotionPolicy: 'restrict',
  preferredIntervals: [1, 2, 6, 11],
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: false,
    parallelOctavesAllowed: false,
    resolveByStep: false,
  },
  preferredImitationTypes: ['strict', 'invertible'],
  rhythmicIndependenceRequired: true,
  lineRoleAssignment: 'fixed',
};

export const BARTOK_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'bartok',
  contrapuntalLinePolicy: BARTOK_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: BARTOK_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'brookmeyer',
  secondaryBbStyle: 'mingus',
  cautionBbStyle: 'schneider',
  gceScorerAdjustments: BARTOK_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto the Bartók VoiceRuleBundle row. */
export function applyBartokSqVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = BARTOK_SQ_VRB_PROFILE;
  return {
    ...bundle,
    contrapuntalLinePolicy: p.contrapuntalLinePolicy,
    bestBbStyle: p.bestBbStyle,
    secondaryBbStyle: p.secondaryBbStyle,
    cautionBbStyle: p.cautionBbStyle,
    sqChordVocabulary: [...p.chordVocabulary],
    sqVrbProfileId: p.vrbId,
    suppressFunctionalResolution: true,
    harmonicRhythm: {
      ...bundle.harmonicRhythm,
      minChordDurationBars: bundle.harmonicRhythm.minChordDurationBars,
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, 8),
      allowMidBarChange: bundle.harmonicRhythm.allowMidBarChange,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'angular',
      maxLeapSemitones: 7,
      preferredIntervalSets: [1, 2, 5, 6, 7],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 2,
      maxSpreadSemitones: 34,
      clusterSizeNotes: [2, 6],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    formPolicy: {
      ...bundle.formPolicy,
      narrativeArc: 'suite',
      sectionRecallEnforced: true,
    },
    rhythmPolicy: {
      ...bundle.rhythmPolicy,
      antiMetric: true,
    },
    repairPolicy: {
      ...bundle.repairPolicy,
      resolveParallels: false,
    },
    duoVoicePolicy: {
      ...(bundle.duoVoicePolicy ?? {
        guitarSource: 'soprano_line',
        bassSource: 'bass_line',
        rhythmicIndependenceFloor: 0.8,
        registerInterlock: true,
        intervalPreference: 'ic1_tritone',
      }),
      rhythmicIndependenceFloor: bundle.duoVoicePolicy?.rhythmicIndependenceFloor ?? 0.8,
      intervalPreference: 'ic1_tritone',
    },
  };
}
