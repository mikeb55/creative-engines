/**
 * Anton Webern SQ VRB — SQ→BB Harmonic Voice profile.
 * Opp. 5 / 9 / 10 / 28 / Bagatelles research baseline.
 * Normative rules: Session Webern VRB prompt (pointillist cells, silence-bounded phrases).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const WEBERN_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'poly_triad_minor_second',
  'poly_triad_tritone',
  'tritone_dyad_anchor',
  'cluster_color_high_register',
  'chromatic_median_shift',
  'octatonic_whole_half',
  'octatonic_half_whole',
  'ii_half_dim7',
  'vii_half_dim7',
  'added_note_color',
  'parallel_color_shift',
] as const;

export const WEBERN_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 40,
  registerCohesionSoftCeilingSt: 45,
  motifRecurrenceWeight: 0.1,
  intervalEconomyWeight: 0.14,
  registerCohesionWeight: 0.16,
  phraseCellBarsMin: 1,
  phraseCellBarsMax: 3,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.02,
  phraseGrammarMode: 'aphoristic_cell_silence_bounded',
  motifRecurrenceHardFailMin: 0.08,
  webernSignatureIntervalBlend: 0.36,
  modalEndingsValid: false,
  silenceBoundaryCredit: 0.18,
  klangfarbenmelodieCredit: 0.14,
  isolatedToneCredit: 0.12,
  ic1SaturationCredit: 0.14,
  tritoneAxisCredit: 0.12,
  rowCompletionBoundaryCredit: 0.14,
  loopingCellPenalty: 0.2,
  longPhraseCellPenalty: 0.16,
  loopingMotifRecurrencePenalty: 0.18,
};

/** Webern SQ — high independence, Klangfarbenmelodie relay, aphoristic non-repeating cells. */
export const WEBERN_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'webern',
  independenceLevel: 'high',
  imitationStyle: 'strict_interval_cycle',
  registerPolicy: 'extreme_pointillist_leaps_all_registers',
  phraseArticulation: 'aphoristic_cell_silence_bounded',
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: true,
    resolveByStep: false,
  },
  preferredImitationTypes: ['strict', 'invertible'],
  rhythmicIndependenceRequired: true,
  lineRoleAssignment: 'dynamic',
};

export const WEBERN_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'webern',
  contrapuntalLinePolicy: WEBERN_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: WEBERN_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'brookmeyer',
  secondaryBbStyle: 'mingus',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: WEBERN_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto film-stub rows (`webern` / `anton_webern`). */
export function applyWebernSqVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = WEBERN_SQ_VRB_PROFILE;
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
      minChordDurationBars: 0,
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, 4),
      allowMidBarChange: true,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'angular',
      maxLeapSemitones: 24,
      preferredIntervalSets: [1, 2, 6, 8, 10],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 8,
      maxSpreadSemitones: 48,
      clusterSizeNotes: [1, 4],
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
        rhythmicIndependenceFloor: 0.72,
        registerInterlock: false,
        intervalPreference: 'chromatic',
      }),
      rhythmicIndependenceFloor: 0.72,
      registerInterlock: false,
      intervalPreference: 'chromatic',
    },
  };
}
