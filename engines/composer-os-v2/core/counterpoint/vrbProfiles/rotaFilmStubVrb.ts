/**
 * Nino Rota film stub — SQ→BB Harmonic Voice profile.
 * Godfather / Amarcord / 8½ / La Dolce Vita research baseline.
 * Normative rules: Session Rota VRB prompt (not general film-scoring defaults).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const ROTA_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'triad_skeleton',
  'dom7',
  'secondary_dominant',
  'chromatic_mediants',
  'chromatic_median_bIII',
  'chromatic_median_bVI',
  'chromatic_median_bII',
  'chromatic_median_shift',
  'added_note_color',
  'parallel_color_shift',
] as const;

export const ROTA_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 19,
  motifRecurrenceWeight: 0.4,
  intervalEconomyWeight: 0.13,
  registerCohesionWeight: 0.24,
  phraseCellBarsMin: 4,
  phraseCellBarsMax: 8,
  phrasePeriodBars: 8,
  cyclicMotifReturnBoost: 0.12,
  phraseGrammarMode: 'strict_periodic_tonal_cadence',
  motifRecurrenceHardFailMin: 0.36,
  rotaSignatureIntervalBlend: 0.3,
  authenticCadenceCredit: 0.22,
  parallelThirdSixthBonus: 0.1,
  wallToWallPhrasePenalty: 0.14,
};

/** Rota SQ — low independence, strict periodic tonal cadence, mid-centrist soprano arch. */
export const ROTA_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'rota',
  independenceLevel: 'low',
  imitationStyle: 'motivic_echo',
  registerPolicy: 'lyrical_soprano_arch_mid_centrist',
  phraseArticulation: 'strict_periodic_tonal_cadence',
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: false,
    resolveByStep: true,
  },
  preferredImitationTypes: ['free', 'invertible'],
  rhythmicIndependenceRequired: false,
  lineRoleAssignment: 'fixed',
};

export const ROTA_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'rota',
  contrapuntalLinePolicy: ROTA_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: ROTA_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: ROTA_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto the film-stub VoiceRuleBundle row (`rota` / `nino_rota`). */
export function applyRotaFilmStubVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = ROTA_SQ_VRB_PROFILE;
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
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, 4),
      allowMidBarChange: false,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'diatonic-step',
      maxLeapSemitones: 9,
      preferredIntervalSets: [1, 2, 3, 4, 8, 9],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 3,
      maxSpreadSemitones: 24,
      clusterSizeNotes: [3, 4],
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
        rhythmicIndependenceFloor: 0.45,
        registerInterlock: true,
        intervalPreference: 'diatonic',
      }),
      rhythmicIndependenceFloor: 0.45,
      intervalPreference: 'diatonic',
    },
  };
}
