/**
 * John Williams film stub — SQ→BB Harmonic Voice profile.
 * Star Wars / Schindler's List / E.T. / Jurassic Park research baseline.
 * Normative rules: Session Williams VRB prompt (not general film-scoring defaults).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const WILLIAMS_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'dom7',
  'dom9',
  'dom13',
  'secondary_dominant',
  'chromatic_mediants',
  'modal_interchange_bVII',
  'lydian_IV',
  'neapolitan_phrygian_color',
  'quartal_fanfare',
  'pandiatonic_chord',
  'chromatic_median_shift',
  'added_note_color',
] as const;

export const WILLIAMS_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 26,
  motifRecurrenceWeight: 0.44,
  intervalEconomyWeight: 0.12,
  registerCohesionWeight: 0.2,
  phraseCellBarsMin: 4,
  phraseCellBarsMax: 16,
  phrasePeriodBars: 8,
  cyclicMotifReturnBoost: 0.14,
  phraseGrammarMode: 'romantic_periodic_cadential',
  motifRecurrenceHardFailMin: 0.38,
  williamsSignatureIntervalBlend: 0.34,
  authenticCadenceCredit: 0.16,
};

/** Williams SQ — moderate independence, leitmotif development, periodic cadential arches. */
export const WILLIAMS_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'williams',
  independenceLevel: 'moderate',
  imitationStyle: 'leitmotif_development',
  registerPolicy: 'heroic_arch_with_fanfare_leaps',
  phraseArticulation: 'romantic_periodic_cadential',
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: false,
    resolveByStep: true,
  },
  preferredImitationTypes: ['free', 'invertible'],
  rhythmicIndependenceRequired: true,
  lineRoleAssignment: 'fixed',
};

export const WILLIAMS_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'williams',
  contrapuntalLinePolicy: WILLIAMS_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: WILLIAMS_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: WILLIAMS_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto the film-stub VoiceRuleBundle row (`williams` / `john_williams`). */
export function applyWilliamsFilmStubVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = WILLIAMS_SQ_VRB_PROFILE;
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
      allowMidBarChange: true,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'diatonic-step',
      maxLeapSemitones: 14,
      preferredIntervalSets: [2, 3, 4, 5, 7, 9],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 5,
      maxSpreadSemitones: 32,
      clusterSizeNotes: [3, 6],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    repairPolicy: {
      ...bundle.repairPolicy,
      resolveParallels: true,
    },
    duoVoicePolicy: {
      ...(bundle.duoVoicePolicy ?? {
        guitarSource: 'soprano_line',
        bassSource: 'bass_line',
        rhythmicIndependenceFloor: 0.55,
        registerInterlock: true,
        intervalPreference: 'diatonic',
      }),
      rhythmicIndependenceFloor: 0.55,
      intervalPreference: 'diatonic',
    },
  };
}
