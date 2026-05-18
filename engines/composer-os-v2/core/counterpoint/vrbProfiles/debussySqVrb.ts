/**
 * Claude Debussy SQ VRB — SQ→BB Harmonic Voice profile (σ = 21).
 * Impressionist parallel planing, whole-tone fields, non-functional colour.
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const DEBUSSY_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'modal_tonic_triad',
  'whole_tone_chord',
  'added_ninth',
  'parallel_planing',
  'unresolved_dominant',
  'pentatonic_cluster',
] as const;

export const DEBUSSY_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 21,
  registerCohesionSoftCeilingSt: 19,
  motifRecurrenceWeight: 0.4,
  intervalEconomyWeight: 0.11,
  registerCohesionWeight: 0.24,
  phraseCellBarsMin: 2,
  phraseCellBarsMax: 8,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.12,
  phraseGrammarMode: 'non_resolving',
  motifRecurrenceHardFailMin: 0.34,
  parallelPlaningCredit: 0.28,
  wholeTonesCredit: 0.28,
  addedNinthCredit: 0.28,
  coloristicHarmonyCredit: 0.28,
  modalCadenceCredit: 0.18,
  dominantResolutionPenalty: 0.28,
  authenticCadencePenalty: 0.28,
  authenticCadenceCredit: 0,
  modalEndingsValid: true,
  inconclusiveEndingCredit: 0.22,
  wallToWallPhrasePenalty: 0,
  singleTonalCentre: true,
  chordTransitionAsBoundary: true,
};

/** Debussy SQ — moderate independence; parallel inner voices; registral bell frames. */
export const DEBUSSY_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'debussy',
  independenceLevel: 'moderate',
  imitationStyle: 'motivic_echo',
  registerPolicy: 'wide_registral_contrast',
  phraseArticulation: 'non_resolving',
  parallelMotionPolicy: 'allow',
  preferredIntervals: [3, 4, 7, 12],
  dissonanceProfile: {
    allowedIntervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: true,
    resolveByStep: false,
  },
  preferredImitationTypes: ['free'],
  rhythmicIndependenceRequired: false,
  lineRoleAssignment: 'fixed',
};

export const DEBUSSY_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'debussy',
  contrapuntalLinePolicy: DEBUSSY_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: DEBUSSY_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: DEBUSSY_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto the Debussy VoiceRuleBundle row. */
export function applyDebussySqVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = DEBUSSY_SQ_VRB_PROFILE;
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
      minChordDurationBars: Math.max(bundle.harmonicRhythm.minChordDurationBars, 1),
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, 12),
      allowMidBarChange: false,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'diatonic-step',
      maxLeapSemitones: 4,
      preferredIntervalSets: [1, 2, 3, 4, 5],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 14,
      maxSpreadSemitones: 36,
      clusterSizeNotes: [2, 7],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    formPolicy: {
      ...bundle.formPolicy,
      narrativeArc: 'continuous-curve',
      sectionRecallEnforced: false,
    },
    rhythmPolicy: {
      ...bundle.rhythmPolicy,
      antiMetric: false,
    },
    repairPolicy: {
      ...bundle.repairPolicy,
      resolveParallels: false,
    },
    duoVoicePolicy: {
      ...(bundle.duoVoicePolicy ?? {
        guitarSource: 'soprano_line',
        bassSource: 'bass_line',
        rhythmicIndependenceFloor: 0.6,
        registerInterlock: true,
        intervalPreference: 'whole_tone_pentatonic',
      }),
      rhythmicIndependenceFloor: bundle.duoVoicePolicy?.rhythmicIndependenceFloor ?? 0.6,
      intervalPreference: 'whole_tone_pentatonic',
    },
  };
}
