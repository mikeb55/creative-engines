/**
 * Joni Mitchell SQ VRB — SQ→BB Harmonic Voice profile.
 * Blue / Hejira / Court and Spark open-tuning research baseline.
 * Normative rules: Session Joni Mitchell VRB prompt (three-tier sus/modal arches).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const JONI_MITCHELL_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'modal_mixolydian',
  'modal_dorian',
  'modal_aeolian',
  'modal_phrygian',
  'add9_add6_add11_surface',
  'triad_skeleton',
  'pandiatonic_chord',
  'lydian_IV',
  'modal_interchange_bVII',
  'tonic_pedal',
  'bass_drone_fifth',
  'dominant_pedal',
  'added_note_color',
] as const;

export const JONI_MITCHELL_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 23,
  registerCohesionSoftCeilingSt: 27,
  motifRecurrenceWeight: 0.28,
  intervalEconomyWeight: 0.12,
  registerCohesionWeight: 0.2,
  phraseCellBarsMin: 4,
  phraseCellBarsMax: 5,
  phrasePeriodBars: 4,
  cyclicMotifReturnBoost: 0.06,
  phraseGrammarMode: 'four_bar_periodic_suspended_non_resolving',
  motifRecurrenceHardFailMin: 0.22,
  joniMitchellSignatureIntervalBlend: 0.34,
  modalEndingsValid: true,
  inconclusiveEndingCredit: 0.16,
  modalCadenceCredit: 0.14,
  susChordCredit: 0.16,
  ic5Credit: 0.14,
  ic2Credit: 0.12,
  lowRegisterPedalCredit: 0.14,
  sopranoArchCredit: 0.14,
  innerVoiceSustainCredit: 0.12,
  loopingCellPenalty: 0.18,
  dominantResolutionPenalty: 0.14,
  shortPhraseCellPenalty: 0.12,
  longPhraseCellPenalty: 0.1,
};

/** Mitchell SQ — moderate independence; three-tier pedal / inner sustain / lyrical soprano. */
export const JONI_MITCHELL_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'joni_mitchell',
  independenceLevel: 'moderate',
  imitationStyle: 'motivic_echo',
  registerPolicy: 'open_string_low_pedal_lyrical_soprano_arch',
  phraseArticulation: 'four_bar_periodic_suspended_non_resolving',
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: false,
    resolveByStep: false,
  },
  preferredImitationTypes: ['free', 'invertible'],
  rhythmicIndependenceRequired: false,
  lineRoleAssignment: 'fixed',
};

export const JONI_MITCHELL_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'joni_mitchell',
  contrapuntalLinePolicy: JONI_MITCHELL_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: JONI_MITCHELL_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'schneider',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: JONI_MITCHELL_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto film-stub rows (`joni_mitchell` / `joni_mitchell_songwriter`). */
export function applyJoniMitchellSqVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = JONI_MITCHELL_SQ_VRB_PROFILE;
  return {
    ...bundle,
    contrapuntalLinePolicy: p.contrapuntalLinePolicy,
    bestBbStyle: p.bestBbStyle,
    secondaryBbStyle: p.secondaryBbStyle,
    cautionBbStyle: p.cautionBbStyle,
    sqChordVocabulary: [...p.chordVocabulary],
    sqVrbProfileId: p.vrbId,
    harmonicRhythm: {
      ...bundle.harmonicRhythm,
      minChordDurationBars: 1,
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, 8),
      allowMidBarChange: false,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'stepwise-arc',
      maxLeapSemitones: 12,
      preferredIntervalSets: [2, 3, 4, 5, 7],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 8,
      maxSpreadSemitones: 36,
      clusterSizeNotes: [2, 5],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    repairPolicy: {
      ...bundle.repairPolicy,
      resolveParallels: false,
    },
    duoVoicePolicy: {
      ...(bundle.duoVoicePolicy ?? {
        guitarSource: 'soprano_line',
        bassSource: 'bass_line',
        rhythmicIndependenceFloor: 0.44,
        registerInterlock: true,
        intervalPreference: 'diatonic',
      }),
      rhythmicIndependenceFloor: 0.44,
      intervalPreference: 'diatonic',
    },
  };
}
