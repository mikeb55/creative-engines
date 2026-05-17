/**
 * Ravel String Quartet in F (1903) + cited late-style research — SQ→BB Harmonic Voice profile.
 * Normative rules: Session Ravel VRB prompt (not general music-theory defaults).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const RAVEL_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'dom7',
  'dom9',
  'dom11',
  'dom13',
  'dom7alt',
  'aug9',
  'aug11',
  'ii_half_dim7',
  'vii_half_dim7',
  'octatonic_whole_half',
  'octatonic_half_whole',
  'added_note_color',
  'parallel_color_shift',
] as const;

export const RAVEL_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 20,
  motifRecurrenceWeight: 0.42,
  intervalEconomyWeight: 0.1,
  registerCohesionWeight: 0.26,
  phraseCellBarsMin: 2,
  phraseCellBarsMax: 4,
  phrasePeriodBars: 8,
  cyclicMotifReturnBoost: 0.12,
};

/** Ravel SQ contrapuntal line policy — moderate independence, motivic echo, periodic cadential phrases. */
export const RAVEL_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'ravel',
  independenceLevel: 'moderate',
  imitationStyle: 'motivic_echo',
  registerPolicy: 'comfortable_with_climax_leaps',
  phraseArticulation: 'periodic_cadential',
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: false,
    resolveByStep: false,
  },
  preferredImitationTypes: ['free', 'invertible'],
  rhythmicIndependenceRequired: true,
  lineRoleAssignment: 'fixed',
};

export const RAVEL_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'ravel',
  contrapuntalLinePolicy: RAVEL_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: RAVEL_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: RAVEL_SQ_GCE_SCORER_ADJUSTMENTS,
  lateStyleAvailable: true,
};

/** Merge SQ→BB profile fields onto the canonical `ravel` VoiceRuleBundle row. */
export function applyRavelSqVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = RAVEL_SQ_VRB_PROFILE;
  return {
    ...bundle,
    contrapuntalLinePolicy: p.contrapuntalLinePolicy,
    bestBbStyle: p.bestBbStyle,
    secondaryBbStyle: p.secondaryBbStyle,
    cautionBbStyle: p.cautionBbStyle,
    sqChordVocabulary: [...p.chordVocabulary],
    sqVrbProfileId: p.vrbId,
    lateStyleAvailable: p.lateStyleAvailable,
    duoVoicePolicy: {
      ...(bundle.duoVoicePolicy ?? {
        guitarSource: 'soprano_line',
        bassSource: 'bass_line',
        rhythmicIndependenceFloor: 0.6,
        registerInterlock: true,
        intervalPreference: 'whole_tone_chromatic',
      }),
      rhythmicIndependenceFloor: 0.6,
      intervalPreference: 'whole_tone_chromatic',
    },
  };
}
