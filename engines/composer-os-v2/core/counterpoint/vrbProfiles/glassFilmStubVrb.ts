/**
 * Philip Glass film stub — SQ→BB Harmonic Voice profile.
 * Mishima / The Hours / Notes on a Scandal research baseline.
 * Normative rules: Session Glass VRB prompt (not Reich/Glass minimalist SQ bundle).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const GLASS_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'modal_aeolian',
  'modal_dorian',
  'modal_phrygian',
  'triad_skeleton',
  'tonic_pedal',
  'add9_add6_add11_surface',
  'added_note_color',
] as const;

export const GLASS_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 18,
  registerCohesionSoftCeilingSt: 16,
  motifRecurrenceWeight: 0.48,
  intervalEconomyWeight: 0.1,
  registerCohesionWeight: 0.26,
  phraseCellBarsMin: 2,
  phraseCellBarsMax: 4,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.16,
  phraseGrammarMode: 'looping_cell_no_cadence',
  motifRecurrenceHardFailMin: 0.42,
  glassSignatureIntervalBlend: 0.34,
  authenticCadenceCredit: 0,
  modalEndingsValid: true,
  inconclusiveEndingCredit: 0.14,
  modalCadenceCredit: 0.12,
  ostinatoPhraseEndingCredit: 0.2,
  parallelThirdSixthBonus: 0.12,
  chordTransitionAsBoundary: true,
  wallToWallPhrasePenalty: 0,
  additiveLayeringCredit: 0.1,
  singleTonalCentre: true,
};

/** Glass SQ — low independence, looping cells, mid-register additive arpeggiation. */
export const GLASS_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'glass',
  independenceLevel: 'low',
  imitationStyle: 'strict_interval_cycle',
  registerPolicy: 'mid_register_additive_expansion',
  phraseArticulation: 'looping_cell_no_cadence',
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7],
    forbiddenIntervals: [8, 9, 10, 11],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: true,
    resolveByStep: false,
  },
  preferredImitationTypes: ['strict', 'free'],
  rhythmicIndependenceRequired: false,
  lineRoleAssignment: 'fixed',
};

export const GLASS_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'glass',
  contrapuntalLinePolicy: GLASS_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: GLASS_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: GLASS_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto film-stub rows (`philip_glass_screen` / `philip_glass_film`). */
export function applyGlassFilmStubVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = GLASS_SQ_VRB_PROFILE;
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
      minChordDurationBars: 2,
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, 4),
      allowMidBarChange: false,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'pattern-loop',
      maxLeapSemitones: 7,
      preferredIntervalSets: [1, 2, 3, 4, 5],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 3,
      maxSpreadSemitones: 18,
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
        rhythmicIndependenceFloor: 0.38,
        registerInterlock: true,
        intervalPreference: 'diatonic',
      }),
      rhythmicIndependenceFloor: 0.38,
      intervalPreference: 'diatonic',
    },
  };
}
