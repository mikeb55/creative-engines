/**
 * György Ligeti SQ VRB — pitch-field spine (σ = 32).
 * Micropolyphony, chromatic cluster saturation, registral formal parameters.
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type { IntervalWeight } from '../../harmony/pitchFieldSpineTypes';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';
import { LIGETI_SQ_VRF_FINGERPRINT_RECEIPTS } from './ligetiSqVrbFingerprints';

export const LIGETI_SQ_INTERVAL_POOL: IntervalWeight[] = [
  { semitones: 1, weight: 1.0 },
  { semitones: 2, weight: 0.95 },
  { semitones: 3, weight: 0.55 },
  { semitones: 4, weight: 0.35 },
  { semitones: 5, weight: 0.3 },
  { semitones: 6, weight: 0.45 },
  { semitones: 7, weight: 0.25 },
  { semitones: 8, weight: 0.2 },
  { semitones: 9, weight: 0.2 },
  { semitones: 10, weight: 0.15 },
  { semitones: 11, weight: 0.15 },
];

/** Ligeti pitch-field texture defaults (also on PitchFieldRegion). */
export const LIGETI_SQ_TEXTURE = {
  textureDensity: 0.85,
  canonOffsetRange: [0.125, 0.5] as [number, number],
  clusterWidth: 8,
  motionBlur: 0.7,
  entryStagger: 0.65,
  mutationStrength: 0.2,
} as const;

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
  phraseCellBarsMin: 8,
  phraseCellBarsMax: 32,
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
  dominantResolutionPenalty: 0.88,
  authenticCadencePenalty: 0.88,
  inconclusiveEndingCredit: 0.12,
  pitchFieldCoherenceCredit: 0.86,
  micropolyphonyCredit: 0.88,
  clusterDensityCredit: 0.85,
  stepwiseMotionCredit: 0.9,
  wallToWallPhrasePenalty: 0,
};

/** Ligeti SQ — micropolyphonic independence; canonic strands; registral formalism. */
export const LIGETI_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'ligeti',
  independenceLevel: 'high',
  imitationStyle: 'strict_interval_cycle',
  registerPolicy: 'registral_expansion_contraction',
  phraseArticulation: 'non_resolving',
  parallelMotionPolicy: 'allow',
  leapPolicy: 'structural_only',
  preferredIntervals: [1, 2],
  dissonanceTolerance: 'high',
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: false,
    resolveByStep: false,
  },
  preferredImitationTypes: ['strict', 'invertible'],
  rhythmicIndependenceRequired: true,
  lineRoleAssignment: 'dynamic',
};

export const LIGETI_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'ligeti',
  harmonicSubstrate: 'pitch-field-spine',
  pitchFieldOptions: {
    defaultOverlapPolicy: 'shared-parent',
    fieldRhythmUnit: 'bar',
    useChordFallbackForCadences: false,
  },
  contrapuntalLinePolicy: LIGETI_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: LIGETI_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: LIGETI_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB pitch-field profile onto the Ligeti VoiceRuleBundle row. */
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
    pitchFieldGoverned: true,
    suppressFunctionalResolution: true,
    harmonicRhythm: {
      minChordDurationBars: 4,
      maxChordDurationBars: 32,
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
      maxLeapSemitones: 3,
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
    orchestrationPolicy: {
      ...bundle.orchestrationPolicy,
      fingerprintReceipts: [
        ...(bundle.orchestrationPolicy.fingerprintReceipts ?? []),
        ...LIGETI_SQ_VRF_FINGERPRINT_RECEIPTS,
      ],
    },
    micropolyphonyMode: true,
    textureAsHarmonyEnabled: true,
    tensionMetricCurvesRequired: true,
    pcFieldStateGrammarEnabled: true,
    silenceAsStructureEnabled: true,
  };
}
