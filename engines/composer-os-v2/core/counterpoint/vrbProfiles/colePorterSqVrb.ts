/**
 * Cole Porter SQ VRB — SQ→BB Harmonic Voice profile (σ = 25).
 * Songbook chromatic functionalism; AABA; goldsmith-forward GCE credits.
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';
import { GOLDSMITH_SQ_VRB_PROFILE } from './goldsmithFilmStubVrb';
import { SQ_SWING_RHYTHM_BY_VRB_ID } from './sqSwingRhythm';

export const COLE_PORTER_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'chromatic_mediants',
  'chromatic_median_bIII',
  'chromatic_median_bVI',
  'chromatic_median_bII',
  'chromatic_median_shift',
  'secondary_dominant',
  'neapolitan_phrygian_color',
  'ii_half_dim7',
  'vii_half_dim7',
  'dom7',
  'dom7alt',
  'dom9',
  'add9_add6_add11_surface',
  'triad_skeleton',
  'added_note_color',
] as const;

export const COLE_PORTER_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 25,
  registerCohesionSoftCeilingSt: 27,
  motifRecurrenceWeight: 0.38,
  intervalEconomyWeight: 0.12,
  registerCohesionWeight: 0.2,
  phraseCellBarsMin: 4,
  phraseCellBarsMax: 8,
  phrasePeriodBars: 8,
  cyclicMotifReturnBoost: 0.12,
  phraseGrammarMode: 'romantic_periodic_cadential',
  motifRecurrenceHardFailMin: 0.34,
  goldsmithSignatureIntervalBlend: 0.28,
  chromaticMediantCredit: 0.26,
  authenticCadenceCredit: 0.28,
  halfStepApproachCredit: 0.24,
  sequentialAscentCredit: 0.22,
  dominantResolutionPenalty: 0.05,
  jazzExtensionCredit: 0.16,
  modalCadenceCredit: 0.1,
  inconclusiveEndingCredit: 0.06,
};

/** Porter SQ — moderate independence; chromatic functional songbook lines. */
export const COLE_PORTER_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'cole_porter',
  independenceLevel: 'moderate',
  imitationStyle: 'motivic_echo',
  registerPolicy: 'lyrical_soprano_arch_mid_centrist',
  phraseArticulation: 'romantic_periodic_cadential',
  parallelMotionPolicy: 'avoid',
  leapPolicy: 'free',
  preferredIntervals: [3, 4, 7, 10],
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: false,
    parallelOctavesAllowed: false,
    resolveByStep: true,
  },
  preferredImitationTypes: ['free', 'invertible'],
  rhythmicIndependenceRequired: false,
  lineRoleAssignment: 'fixed',
};

export const COLE_PORTER_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'cole_porter',
  contrapuntalLinePolicy: COLE_PORTER_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: COLE_PORTER_SQ_CHORD_VOCABULARY,
  bestBbStyle: GOLDSMITH_SQ_VRB_PROFILE.bestBbStyle,
  secondaryBbStyle: GOLDSMITH_SQ_VRB_PROFILE.secondaryBbStyle,
  cautionBbStyle: GOLDSMITH_SQ_VRB_PROFILE.cautionBbStyle,
  gceScorerAdjustments: COLE_PORTER_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto the Cole Porter VoiceRuleBundle row. */
export function applyColePorterSqVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = COLE_PORTER_SQ_VRB_PROFILE;
  return {
    ...bundle,
    contrapuntalLinePolicy: p.contrapuntalLinePolicy,
    bestBbStyle: p.bestBbStyle,
    secondaryBbStyle: p.secondaryBbStyle,
    cautionBbStyle: p.cautionBbStyle,
    sqChordVocabulary: [...p.chordVocabulary],
    sqVrbProfileId: p.vrbId,
    suppressFunctionalResolution: false,
    harmonicRhythm: {
      minChordDurationBars: 1,
      maxChordDurationBars: 2,
      allowMidBarChange: true,
    },
    bassPolicy: {
      role: 'chromatic-descent-or-root',
      allowOctaveDoubling: false,
    },
    voicingPolicy: {
      minSpreadSemitones: 14,
      maxSpreadSemitones: 20,
      clusterSizeNotes: [3, 5],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    melodicPolicy: {
      contour: 'speech-elegant',
      maxLeapSemitones: 14,
      preferredIntervalSets: [1, 2, 3, 4, 6, 8],
    },
    formPolicy: {
      narrativeArc: 'aaba-or-extended-refrain',
      sectionRecallEnforced: true,
    },
    rhythmPolicy: {
      antiMetric: false,
    },
    repairPolicy: {
      resolveParallels: true,
      maxVoiceOverlap: 6,
    },
    duoVoicePolicy: {
      ...(bundle.duoVoicePolicy ?? {
        guitarSource: 'soprano_line',
        bassSource: 'bass_line',
        rhythmicIndependenceFloor: 0.4,
        registerInterlock: true,
        intervalPreference: 'chromatic',
      }),
      rhythmicIndependenceFloor: 0.4,
      intervalPreference: 'chromatic',
    },
    swingFeel: false,
    swingStyle: SQ_SWING_RHYTHM_BY_VRB_ID.cole_porter.swingStyle,
    swingIntensity: SQ_SWING_RHYTHM_BY_VRB_ID.cole_porter.swingIntensity,
    anticipationRateMax: SQ_SWING_RHYTHM_BY_VRB_ID.cole_porter.anticipationRateMax,
    guideToneVoiceLeading: bundle.guideToneVoiceLeading ?? true,
    chromaticBassEnabled: bundle.chromaticBassEnabled ?? true,
    majorMinorMixtureEnabled: bundle.majorMinorMixtureEnabled ?? true,
  };
}
