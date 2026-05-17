/**
 * Jerry Goldsmith film stub — SQ→BB Harmonic Voice profile.
 * Planet of the Apes / Chinatown / Star Trek / Total Recall research baseline.
 * Normative rules: Session Goldsmith VRB prompt (Period C late-romantic action/adventure).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const GOLDSMITH_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'dom7',
  'dom9',
  'dom7alt',
  'aug9',
  'secondary_dominant',
  'chromatic_mediants',
  'chromatic_median_bIII',
  'chromatic_median_bVI',
  'chromatic_median_bII',
  'chromatic_median_shift',
  'modal_mixolydian',
  'triad_skeleton',
  'added_note_color',
] as const;

export const GOLDSMITH_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 24,
  registerCohesionSoftCeilingSt: 26,
  motifRecurrenceWeight: 0.4,
  intervalEconomyWeight: 0.11,
  registerCohesionWeight: 0.18,
  phraseCellBarsMin: 4,
  phraseCellBarsMax: 6,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.1,
  phraseGrammarMode: 'doubly_open_cell_development',
  motifRecurrenceHardFailMin: 0.34,
  goldsmithSignatureIntervalBlend: 0.32,
  authenticCadenceCredit: 0.08,
  modalEndingsValid: true,
  inconclusiveEndingCredit: 0.12,
  modalCadenceCredit: 0.14,
  ostinatoPhraseEndingCredit: 0.16,
  sequentialAscentCredit: 0.12,
  chromaticMediantCredit: 0.12,
};

/** Goldsmith SQ — moderate independence, doubly-open cells, volatile wide register arc. */
export const GOLDSMITH_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'goldsmith',
  independenceLevel: 'moderate',
  imitationStyle: 'staggered_entry',
  registerPolicy: 'dramatically_volatile_wide_arc',
  phraseArticulation: 'doubly_open_cell_development',
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: false,
    resolveByStep: false,
  },
  preferredImitationTypes: ['free', 'invertible'],
  rhythmicIndependenceRequired: true,
  lineRoleAssignment: 'dynamic',
};

export const GOLDSMITH_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'goldsmith',
  contrapuntalLinePolicy: GOLDSMITH_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: GOLDSMITH_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: GOLDSMITH_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto the film-stub row (`goldsmith` / `jerry_goldsmith`). */
export function applyGoldsmithFilmStubVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = GOLDSMITH_SQ_VRB_PROFILE;
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
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, 6),
      allowMidBarChange: true,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'angular',
      maxLeapSemitones: 14,
      preferredIntervalSets: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 5,
      maxSpreadSemitones: 36,
      clusterSizeNotes: [3, 6],
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
        rhythmicIndependenceFloor: 0.52,
        registerInterlock: true,
        intervalPreference: 'chromatic',
      }),
      rhythmicIndependenceFloor: 0.52,
      intervalPreference: 'chromatic',
    },
  };
}
