/**
 * György Ligeti SQ VRB — SQ→BB Harmonic Voice profile (σ = 32).
 * Micropolyphony, chromatic cluster saturation, registral formal parameters.
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const LIGETI_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'cluster_color_high_register',
  'poly_triad_minor_second',
  'poly_triad_tritone',
  'tritone_dyad_anchor',
  'chromatic_median_shift',
  'added_note_color',
  'pandiatonic_chord',
] as const;

export const LIGETI_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 32,
  registerCohesionSoftCeilingSt: 36,
  motifRecurrenceWeight: 0.12,
  intervalEconomyWeight: 0.1,
  registerCohesionWeight: 0.2,
  phraseCellBarsMin: 4,
  phraseCellBarsMax: 16,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.02,
  phraseGrammarMode: 'micropolyphonic_stasis',
  motifRecurrenceHardFailMin: 0.08,
  modalEndingsValid: false,
  chromaticClusterCredit: 0.18,
  cadentialResolutionPenalty: 0.14,
  registralExpansionCredit: 0.16,
  densityTransformationCredit: 0.14,
  folkModalPenalty: 0.16,
  ic1SaturationCredit: 0.16,
  dominantResolutionPenalty: 0.14,
  inconclusiveEndingCredit: 0.12,
  wallToWallPhrasePenalty: 0,
};

/** Ligeti SQ — maximum micropolyphonic independence; canonic strands; registral formalism. */
export const LIGETI_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'ligeti',
  independenceLevel: 'maximum',
  imitationStyle: 'strict_interval_cycle',
  registerPolicy: 'registral_expansion_contraction',
  phraseArticulation: 'micropolyphonic_stasis',
  parallelMotionPolicy: 'avoid',
  leapPolicy: 'structural_only',
  preferredIntervals: [1, 2],
  dissonanceTolerance: 'high',
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: false,
    parallelOctavesAllowed: false,
    resolveByStep: false,
  },
  preferredImitationTypes: ['strict', 'invertible'],
  rhythmicIndependenceRequired: true,
  lineRoleAssignment: 'dynamic',
};

export const LIGETI_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'ligeti',
  contrapuntalLinePolicy: LIGETI_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: LIGETI_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: LIGETI_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto the Ligeti VoiceRuleBundle row. */
export function applyLigetiSqVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = LIGETI_SQ_VRB_PROFILE;
  return {
    ...bundle,
    contrapuntalLinePolicy: p.contrapuntalLinePolicy,
    bestBbStyle: p.bestBbStyle,
    secondaryBbStyle: p.secondaryBbStyle,
    cautionBbStyle: p.cautionBbStyle,
    sqChordVocabulary: [...p.chordVocabulary],
    sqVrbProfileId: p.vrbId,
    harmonicRhythm: {
      minChordDurationBars: 4,
      maxChordDurationBars: 16,
      allowMidBarChange: false,
    },
    bassPolicy: {
      role: 'registral_boundary',
      allowOctaveDoubling: false,
    },
    voicingPolicy: {
      minSpreadSemitones: 8,
      maxSpreadSemitones: 36,
      clusterSizeNotes: [4, 8],
      forbidParallelFifths: false,
      forbidOctaveDoubling: true,
    },
    melodicPolicy: {
      contour: 'neighbor-motion',
      maxLeapSemitones: 14,
      preferredIntervalSets: [1, 2],
      preferredIntervals: [1, 2],
      directionalArch: true,
    },
    formPolicy: {
      narrativeArc: 'continuous-sections',
      sectionRecallEnforced: false,
      goldenMeanClimax: true,
      densityExpansionContraction: true,
      noCadentialRelease: true,
      stasisSurface: true,
    },
    rhythmPolicy: {
      antiMetric: true,
      phaseDisplacement: true,
    },
    repairPolicy: {
      resolveParallels: false,
      maxVoiceOverlap: 8,
    },
    duoVoicePolicy: {
      ...(bundle.duoVoicePolicy ?? {
        guitarSource: 'soprano_line',
        bassSource: 'bass_line',
        rhythmicIndependenceFloor: 0.55,
        registerInterlock: true,
        intervalPreference: 'chromatic',
      }),
      rhythmicIndependenceFloor: 0.55,
      registerInterlock: true,
      intervalPreference: 'chromatic',
    },
    micropolyphonyMode: true,
    textureAsHarmonyEnabled: true,
    tensionMetricCurvesRequired: true,
    pcFieldStateGrammarEnabled: true,
    silenceAsStructureEnabled: true,
  };
}
