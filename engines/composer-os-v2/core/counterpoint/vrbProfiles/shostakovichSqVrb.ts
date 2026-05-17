/**
 * Dmitri Shostakovich SQ VRB — SQ→BB Harmonic Voice profile.
 * String Quartets Nos. 3, 6, 8, 10 / Piano Quintet / Symphony No. 5 research baseline.
 * Normative rules: Session Shostakovich VRB prompt (asymmetric cells, non-resolving arches).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const SHOSTAKOVICH_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'triad_skeleton',
  'modal_aeolian',
  'modal_dorian',
  'modal_phrygian',
  'chromatic_mediants',
  'chromatic_median_bIII',
  'chromatic_median_bVI',
  'chromatic_median_bII',
  'chromatic_median_shift',
  'tritone_dyad_anchor',
  'poly_triad_tritone',
  'ii_half_dim7',
  'vii_half_dim7',
  'tonic_pedal',
  'bass_drone_fifth',
  'added_note_color',
] as const;

export const SHOSTAKOVICH_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 28,
  registerCohesionSoftCeilingSt: 32,
  motifRecurrenceWeight: 0.46,
  intervalEconomyWeight: 0.1,
  registerCohesionWeight: 0.2,
  phraseCellBarsMin: 2,
  phraseCellBarsMax: 5,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.14,
  phraseGrammarMode: 'asymmetric_cell_non_resolving',
  motifRecurrenceHardFailMin: 0.32,
  shostakovichSignatureIntervalBlend: 0.34,
  modalEndingsValid: true,
  inconclusiveEndingCredit: 0.16,
  ostinatoPhraseEndingCredit: 0.18,
  chromaticMediantCredit: 0.14,
  tritoneAxisCredit: 0.12,
  thirdRelationCredit: 0.14,
  halfStepApproachCredit: 0.1,
  passacagliaPedalCredit: 0.14,
  bassPedalCredit: 0.12,
  strettoMotifSaturationCredit: 0.12,
};

/** Shostakovich SQ — moderate independence; melody+accompaniment default; fugue bursts as climax. */
export const SHOSTAKOVICH_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'shostakovich',
  independenceLevel: 'moderate',
  imitationStyle: 'staggered_entry',
  registerPolicy: 'low_biased_extreme_punctuation_spikes',
  phraseArticulation: 'asymmetric_cell_non_resolving',
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: false,
    resolveByStep: false,
  },
  preferredImitationTypes: ['strict', 'invertible', 'free'],
  rhythmicIndependenceRequired: false,
  lineRoleAssignment: 'fixed',
};

export const SHOSTAKOVICH_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'shostakovich',
  contrapuntalLinePolicy: SHOSTAKOVICH_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: SHOSTAKOVICH_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'mingus',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: SHOSTAKOVICH_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto the SQ-family row (`shostakovich` / `dmitri_shostakovich`). */
export function applyShostakovichSqVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = SHOSTAKOVICH_SQ_VRB_PROFILE;
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
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, 16),
      allowMidBarChange: true,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'stepwise-with-leaps',
      maxLeapSemitones: 14,
      preferredIntervalSets: [1, 2, 3, 4, 6, 8],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 6,
      maxSpreadSemitones: 36,
      clusterSizeNotes: [2, 6],
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
        rhythmicIndependenceFloor: 0.48,
        registerInterlock: true,
        intervalPreference: 'chromatic',
      }),
      rhythmicIndependenceFloor: 0.48,
      intervalPreference: 'chromatic',
    },
  };
}
