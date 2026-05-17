/**
 * Bernard Herrmann film stub — SQ→BB Harmonic Voice profile.
 * Psycho / Vertigo / Day the Earth Stood Still / Ghost and Mrs. Muir research baseline.
 * Normative rules: Session Herrmann VRB prompt (not general film-scoring defaults).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const HERRMANN_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'poly_triad_minor_second',
  'poly_triad_tritone',
  'tritone_dyad_anchor',
  'cluster_color_high_register',
  'chromatic_median_shift',
  'leitmotif_polytriad',
  'added_note_color',
] as const;

export const HERRMANN_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 36,
  motifRecurrenceWeight: 0.48,
  intervalEconomyWeight: 0.12,
  registerCohesionWeight: 0.14,
  phraseCellBarsMin: 0.5,
  phraseCellBarsMax: 2,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.14,
  phraseGrammarMode: 'ostinato_cell',
  motifRecurrenceHardFailMin: 0.25,
  herrmannSignatureIntervalBlend: 0.35,
  ostinatoPhraseEndingCredit: 0.18,
  dissonantClosureCredit: 0.12,
};

/** Herrmann SQ contrapuntal line policy — low layer independence, ostinato cells, extreme registers. */
export const HERRMANN_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'herrmann',
  independenceLevel: 'low',
  imitationStyle: 'staggered_entry',
  registerPolicy: 'extreme_registers',
  phraseArticulation: 'ostinato_cell_based',
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: false,
    resolveByStep: false,
  },
  preferredImitationTypes: ['free', 'strict'],
  rhythmicIndependenceRequired: false,
  lineRoleAssignment: 'fixed',
};

export const HERRMANN_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'herrmann',
  contrapuntalLinePolicy: HERRMANN_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: HERRMANN_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'brookmeyer',
  secondaryBbStyle: 'mingus',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: HERRMANN_SQ_GCE_SCORER_ADJUSTMENTS,
  herrmannRomanticModeAvailable: true,
};

/** Merge SQ→BB profile onto the film-stub VoiceRuleBundle row (`herrmann` / `bernard_herrmann`). */
export function applyHerrmannFilmStubVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = HERRMANN_SQ_VRB_PROFILE;
  return {
    ...bundle,
    contrapuntalLinePolicy: p.contrapuntalLinePolicy,
    bestBbStyle: p.bestBbStyle,
    secondaryBbStyle: p.secondaryBbStyle,
    cautionBbStyle: p.cautionBbStyle,
    sqChordVocabulary: [...p.chordVocabulary],
    sqVrbProfileId: p.vrbId,
    herrmannRomanticModeAvailable: p.herrmannRomanticModeAvailable,
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'angular',
      maxLeapSemitones: 14,
      preferredIntervalSets: [1, 3, 6, 7],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 8,
      maxSpreadSemitones: 48,
      clusterSizeNotes: [3, 8],
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
        intervalPreference: 'ic1_tritone',
      }),
      rhythmicIndependenceFloor: 0.45,
      intervalPreference: 'ic1_tritone',
    },
  };
}
