/**
 * Arvo Pärt SQ VRB — SQ→BB Harmonic Voice profile (σ = 16).
 * Tintinnabuli M+T two-voice; modal diatonic; pedal bass; silence as structure.
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const ARVO_PART_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'modal_tonic_triad',
  'modal_open_fifth',
  'tonic_pedal',
  'bass_drone_fifth',
  'pandiatonic_chord',
  'modal_subtonic',
] as const;

export const ARVO_PART_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 16,
  registerCohesionSoftCeilingSt: 14,
  motifRecurrenceWeight: 0.38,
  intervalEconomyWeight: 0.12,
  registerCohesionWeight: 0.28,
  phraseCellBarsMin: 4,
  phraseCellBarsMax: 16,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.1,
  phraseGrammarMode: 'non_resolving',
  motifRecurrenceHardFailMin: 0.32,
  glassSignatureIntervalBlend: 0.14,
  authenticCadenceCredit: 0,
  authenticCadencePenalty: 0.28,
  modalEndingsValid: true,
  inconclusiveEndingCredit: 0.28,
  modalCadenceCredit: 0.26,
  dominantResolutionPenalty: 0.28,
  silenceBoundaryCredit: 0.28,
  bassPedalCredit: 0.28,
  loopingCellCredit: 0.18,
  ostinatoPhraseEndingCredit: 0.22,
  wallToWallPhrasePenalty: 0,
  singleTonalCentre: true,
  chordTransitionAsBoundary: true,
};

/** Arvo Pärt SQ — moderate independence; M-voice stepwise + T-voice triad tintinnabuli. */
export const ARVO_PART_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'arvo_part',
  independenceLevel: 'moderate',
  imitationStyle: 'motivic_echo',
  registerPolicy: 'open_string_low_pedal_lyrical_soprano_arch',
  phraseArticulation: 'non_resolving',
  parallelMotionPolicy: 'allow',
  preferredIntervals: [0, 5, 7, 12],
  dissonanceProfile: {
    allowedIntervals: [0, 1, 2, 3, 4, 5, 6, 7],
    forbiddenIntervals: [8, 9, 10, 11],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: true,
    resolveByStep: false,
  },
  preferredImitationTypes: ['free'],
  rhythmicIndependenceRequired: false,
  lineRoleAssignment: 'fixed',
};

export const ARVO_PART_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'arvo_part',
  contrapuntalLinePolicy: ARVO_PART_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: ARVO_PART_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: ARVO_PART_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto the Arvo Pärt / `part` VoiceRuleBundle row. */
export function applyArvoPartSqVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = ARVO_PART_SQ_VRB_PROFILE;
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
      ...bundle.harmonicRhythm,
      minChordDurationBars: 4,
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, 64),
      allowMidBarChange: false,
    },
    bassPolicy: {
      ...bundle.bassPolicy,
      role: 'pedal-or-drone',
      allowOctaveDoubling: true,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'stepwise-diatonic',
      maxLeapSemitones: 3,
      preferredIntervalSets: [1, 2, 5, 7],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 12,
      maxSpreadSemitones: 16,
      clusterSizeNotes: [2, 4],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    formPolicy: {
      ...bundle.formPolicy,
      narrativeArc: 'variation-or-arch',
      sectionRecallEnforced: false,
      stasisSurface: true,
    },
    rhythmPolicy: {
      ...bundle.rhythmPolicy,
      antiMetric: false,
    },
    repairPolicy: {
      ...bundle.repairPolicy,
      resolveParallels: false,
    },
    duoVoicePolicy: {
      ...(bundle.duoVoicePolicy ?? {
        guitarSource: 'soprano_line',
        bassSource: 'bass_line',
        rhythmicIndependenceFloor: 0.9,
        registerInterlock: true,
        intervalPreference: 'diatonic',
      }),
      rhythmicIndependenceFloor: bundle.duoVoicePolicy?.rhythmicIndependenceFloor ?? 0.9,
      intervalPreference: 'diatonic',
    },
    silenceAsStructureEnabled: true,
    tintinnabuliEnabled: bundle.tintinnabuliEnabled ?? true,
    tVoicePositionModes: bundle.tVoicePositionModes,
    sacredProfile: bundle.sacredProfile ?? true,
    silenceAsStructure: bundle.silenceAsStructure ?? true,
    noTeleologicalDevelopment: bundle.noTeleologicalDevelopment ?? true,
    forbidAudibleProcessOperators: bundle.forbidAudibleProcessOperators ?? true,
  };
}
