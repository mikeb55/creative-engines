/**
 * George Gershwin SQ VRB — SQ→BB Harmonic Voice profile (σ = 27).
 * Jazz-concert hybrid; dom7–dom13; blues colour; AABA + rhapsody.
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

export const GERSHWIN_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'dom7',
  'dom9',
  'dom13',
  'dom7alt',
  'secondary_dominant',
  'chromatic_mediants',
  'lydian_IV',
  'modal_interchange_bVII',
  'ii_half_dim7',
  'add9_add6_add11_surface',
  'triad_skeleton',
  'added_note_color',
] as const;

export const GERSHWIN_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 27,
  registerCohesionSoftCeilingSt: 29,
  motifRecurrenceWeight: 0.42,
  intervalEconomyWeight: 0.11,
  registerCohesionWeight: 0.2,
  phraseCellBarsMin: 4,
  phraseCellBarsMax: 8,
  phrasePeriodBars: 8,
  cyclicMotifReturnBoost: 0.14,
  phraseGrammarMode: 'romantic_periodic_cadential',
  motifRecurrenceHardFailMin: 0.36,
  williamsSignatureIntervalBlend: 0.22,
  authenticCadenceCredit: 0.3,
  jazzExtensionCredit: 0.28,
  chromaticMediantCredit: 0.26,
  halfStepApproachCredit: 0.24,
  dominantResolutionPenalty: 0.05,
  modalCadenceCredit: 0.12,
  inconclusiveEndingCredit: 0.08,
  sequentialAscentCredit: 0.18,
};

/** Gershwin SQ — moderate independence; singable arch + concert bravura leaps. */
export const GERSHWIN_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'gershwin',
  independenceLevel: 'moderate',
  imitationStyle: 'motivic_echo',
  registerPolicy: 'lyrical_soprano_arch_mid_centrist',
  phraseArticulation: 'romantic_periodic_cadential',
  parallelMotionPolicy: 'avoid',
  leapPolicy: 'free',
  preferredIntervals: [3, 4, 7, 10],
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: false,
    parallelOctavesAllowed: false,
    resolveByStep: true,
  },
  preferredImitationTypes: ['free', 'invertible'],
  rhythmicIndependenceRequired: false,
  lineRoleAssignment: 'fixed',
};

export const GERSHWIN_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'gershwin',
  contrapuntalLinePolicy: GERSHWIN_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: GERSHWIN_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: GERSHWIN_SQ_GCE_SCORER_ADJUSTMENTS,
};

/** Merge SQ→BB profile onto the Gershwin VoiceRuleBundle row. */
export function applyGershwinSqVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = GERSHWIN_SQ_VRB_PROFILE;
  return {
    ...bundle,
    contrapuntalLinePolicy: p.contrapuntalLinePolicy,
    bestBbStyle: p.bestBbStyle,
    secondaryBbStyle: p.secondaryBbStyle,
    cautionBbStyle: p.cautionBbStyle,
    sqChordVocabulary: [...p.chordVocabulary],
    sqVrbProfileId: p.vrbId,
    suppressFunctionalResolution: false,
    harmonicRhythm: {
      minChordDurationBars: 1,
      maxChordDurationBars: 2,
      allowMidBarChange: true,
    },
    bassPolicy: {
      role: 'walking-or-symphonic',
      allowOctaveDoubling: false,
    },
    voicingPolicy: {
      minSpreadSemitones: 16,
      maxSpreadSemitones: 24,
      clusterSizeNotes: [3, 5],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    melodicPolicy: {
      contour: 'blues-diatonic',
      maxLeapSemitones: 14,
      preferredIntervalSets: [1, 2, 3, 4, 5, 7],
    },
    formPolicy: {
      narrativeArc: 'aaba-or-rhapsody',
      sectionRecallEnforced: true,
    },
    rhythmPolicy: {
      antiMetric: false,
    },
    repairPolicy: {
      resolveParallels: true,
      maxVoiceOverlap: 6,
    },
    duoVoicePolicy: {
      ...(bundle.duoVoicePolicy ?? {
        guitarSource: 'soprano_line',
        bassSource: 'bass_line',
        rhythmicIndependenceFloor: 0.45,
        registerInterlock: true,
        intervalPreference: 'chromatic',
      }),
      rhythmicIndependenceFloor: 0.45,
      intervalPreference: 'chromatic',
    },
    swingFeel: false,
    guideToneVoiceLeading: true,
    blueNoteEnabled: true,
    jazzExtensionEnabled: true,
    bluesColourEnabled: true,
    rhythmChangesEnabled: true,
    concertModeEnabled: bundle.concertModeEnabled ?? true,
    songModeEnabled: bundle.songModeEnabled ?? true,
    chromaticBassEnabled: bundle.chromaticBassEnabled ?? true,
  };
}
