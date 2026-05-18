/**
 * Erik Satie SQ VRB — SQ→BB Harmonic Voice profile (σ = 19).
 * Modal salon / furniture music; parallel planing; non-functional dominant colour.
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const SATIE_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'triad_skeleton',
  'add9_add6_add11_surface',
  'modal_aeolian',
  'modal_dorian',
  'modal_phrygian',
  'modal_mixolydian',
  'parallel_color_shift',
  'pandiatonic_chord',
  'dom7',
  'added_note_color',
  'tonic_pedal',
] as const;

export const SATIE_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 19,
  registerCohesionSoftCeilingSt: 17,
  motifRecurrenceWeight: 0.5,
  intervalEconomyWeight: 0.11,
  registerCohesionWeight: 0.25,
  phraseCellBarsMin: 2,
  phraseCellBarsMax: 4,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.14,
  phraseGrammarMode: 'looping_cell_no_cadence',
  motifRecurrenceHardFailMin: 0.4,
  authenticCadenceCredit: 0,
  modalEndingsValid: true,
  parallelThirdSixthBonus: 0.28,
  inconclusiveEndingCredit: 0.26,
  modalCadenceCredit: 0.24,
  dominantResolutionPenalty: 0.28,
  ostinatoPhraseEndingCredit: 0.26,
  wallToWallPhrasePenalty: 0,
  singleTonalCentre: true,
  chordTransitionAsBoundary: true,
};

/** Satie SQ — low independence; parallel planing; furniture periodic cells. */
export const SATIE_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'satie',
  independenceLevel: 'low',
  imitationStyle: 'motivic_echo',
  registerPolicy: 'lyrical_soprano_arch_mid_centrist',
  phraseArticulation: 'looping_cell_no_cadence',
  parallelMotionPolicy: 'allow',
  preferredIntervals: [3, 4, 7],
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7],
    forbiddenIntervals: [8, 9, 10, 11],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: true,
    resolveByStep: false,
  },
  preferredImitationTypes: ['free'],
  rhythmicIndependenceRequired: false,
  lineRoleAssignment: 'fixed',
};

export const SATIE_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'satie',
  contrapuntalLinePolicy: SATIE_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: SATIE_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: SATIE_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto the Satie VoiceRuleBundle row. */
export function applySatieSqVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = SATIE_SQ_VRB_PROFILE;
  return {
    ...bundle,
    contrapuntalLinePolicy: p.contrapuntalLinePolicy,
    bestBbStyle: p.bestBbStyle,
    secondaryBbStyle: p.secondaryBbStyle,
    cautionBbStyle: p.cautionBbStyle,
    sqChordVocabulary: [...p.chordVocabulary],
    sqVrbProfileId: p.vrbId,
    suppressFunctionalResolution: true,
    harmonicRhythm: {
      minChordDurationBars: 4,
      maxChordDurationBars: 16,
      allowMidBarChange: false,
    },
    bassPolicy: {
      role: 'pedal-or-static',
      allowOctaveDoubling: true,
    },
    voicingPolicy: {
      minSpreadSemitones: 12,
      maxSpreadSemitones: 18,
      clusterSizeNotes: [3, 4],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    melodicPolicy: {
      contour: 'stepwise-modal',
      maxLeapSemitones: 4,
      preferredIntervalSets: [1, 2, 3, 4],
    },
    formPolicy: {
      narrativeArc: 'non-teleological',
      sectionRecallEnforced: false,
      stasisSurface: true,
    },
    rhythmPolicy: {
      antiMetric: false,
    },
    repairPolicy: {
      resolveParallels: false,
      maxVoiceOverlap: 6,
    },
    duoVoicePolicy: {
      ...(bundle.duoVoicePolicy ?? {
        guitarSource: 'soprano_line',
        bassSource: 'bass_line',
        rhythmicIndependenceFloor: 0.35,
        registerInterlock: true,
        intervalPreference: 'diatonic',
      }),
      rhythmicIndependenceFloor: 0.35,
      intervalPreference: 'diatonic',
    },
    parallelChordsEnabled: bundle.parallelChordsEnabled ?? true,
    unresolvedDominantEnabled: bundle.unresolvedDominantEnabled ?? true,
    furnitureModeEnabled: bundle.furnitureModeEnabled ?? true,
    noTeleologicalDevelopment: bundle.noTeleologicalDevelopment ?? true,
    swingFeel: false,
  };
}
