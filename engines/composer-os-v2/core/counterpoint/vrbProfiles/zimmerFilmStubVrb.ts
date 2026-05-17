/**
 * Hans Zimmer film stub — SQ→BB Harmonic Voice profile.
 * Interstellar / Inception / Dark Knight / Gladiator research baseline.
 * Normative rules: Session Zimmer VRB prompt (cathartic ostinato default; passacaglia sub-mode documented).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

/** Passacaglia sub-mode — ground bass + progressive entry (not a separate vrbId). */
export const ZIMMER_PASSACAGLIA_SUB_MODE = {
  independenceLevel: 'moderate' as const,
  registerPolicy: 'systematic_bass_to_soprano_expansion' as const,
  phraseArticulation: 'ground_iterations_progressive_entry' as const,
  gceRegisterCohesionStdevCeilingSt: 28,
};

export const ZIMMER_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'modal_aeolian',
  'modal_dorian',
  'modal_phrygian',
  'chromatic_median_bVI',
  'chromatic_median_bIII',
  'aeolian_cadence_bVI_bVII_i',
  'triad_skeleton',
  'add9_add6_add11_surface',
  'tonic_pedal',
  'bass_drone_fifth',
  'chromatic_mediants',
  'added_note_color',
] as const;

export const ZIMMER_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 26,
  registerCohesionSoftCeilingSt: 26,
  motifRecurrenceWeight: 0.48,
  intervalEconomyWeight: 0.1,
  registerCohesionWeight: 0.22,
  phraseCellBarsMin: 4,
  phraseCellBarsMax: 8,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.12,
  phraseGrammarMode: 'repeating_ostinato_no_cadence',
  motifRecurrenceHardFailMin: 0.4,
  zimmerSignatureIntervalBlend: 0.32,
  authenticCadenceCredit: 0.04,
  modalEndingsValid: true,
  inconclusiveEndingCredit: 0.14,
  modalCadenceCredit: 0.14,
  ostinatoPhraseEndingCredit: 0.18,
  chromaticMediantCredit: 0.12,
  subMediantColorCredit: 0.1,
  wallToWallPhrasePenalty: 0,
  additiveLayeringCredit: 0.14,
};

/** Zimmer SQ — low independence, cathartic ostinato, wide accumulative register arc. */
export const ZIMMER_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'zimmer',
  independenceLevel: 'low',
  imitationStyle: 'staggered_entry',
  registerPolicy: 'dynamically_wide_arc_accumulative',
  phraseArticulation: 'repeating_ostinato_no_cadence',
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: true,
    resolveByStep: false,
  },
  preferredImitationTypes: ['free', 'strict'],
  rhythmicIndependenceRequired: false,
  lineRoleAssignment: 'fixed',
};

export const ZIMMER_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'zimmer',
  contrapuntalLinePolicy: ZIMMER_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: ZIMMER_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: ZIMMER_SQ_GCE_SCORER_ADJUSTMENTS,
  zimmerPassacagliaSubMode: ZIMMER_PASSACAGLIA_SUB_MODE,
};

/** Merge SQ→BB profile onto film-stub rows (`zimmer` / `hans_zimmer`). */
export function applyZimmerFilmStubVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = ZIMMER_SQ_VRB_PROFILE;
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
      contour: 'pattern-loop',
      maxLeapSemitones: 12,
      preferredIntervalSets: [1, 2, 3, 4, 5, 7],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 6,
      maxSpreadSemitones: 32,
      clusterSizeNotes: [3, 5],
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
        rhythmicIndependenceFloor: 0.4,
        registerInterlock: true,
        intervalPreference: 'diatonic',
      }),
      rhythmicIndependenceFloor: 0.4,
      intervalPreference: 'diatonic',
    },
  };
}
