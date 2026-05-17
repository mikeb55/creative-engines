/**
 * Angelo Badalamenti film stub — SQ→BB Harmonic Voice profile.
 * Twin Peaks / Blue Velvet / Mulholland Drive / The Straight Story research baseline.
 * Normative rules: Session Badalamenti VRB prompt (through-composed arch, not loop-cell).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqBadalamentiThreeTierTexture,
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

/** Vln I melody / Vln II–Vla jazz cushion / Vc pedal — documented three-tier model. */
export const BADALAMENTI_THREE_TIER_TEXTURE: SqBadalamentiThreeTierTexture = {
  melodyLine: 'vln_i_lead',
  innerVoices: 'chromatic_jazz_extensions',
  bassLine: 'pedal_anchor',
};

export const BADALAMENTI_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'modal_aeolian',
  'modal_dorian',
  'modal_phrygian',
  'chromatic_median_bIII',
  'chromatic_median_bVI',
  'chromatic_mediants',
  'dom7',
  'dom9',
  'dom11',
  'dom13',
  'add9_add6_add11_surface',
  'added_note_color',
  'lydian_IV',
  'tonic_pedal',
  'bass_drone_fifth',
  'triad_skeleton',
] as const;

export const BADALAMENTI_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 21,
  motifRecurrenceWeight: 0.38,
  intervalEconomyWeight: 0.12,
  registerCohesionWeight: 0.24,
  phraseCellBarsMin: 16,
  phraseCellBarsMax: 20,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.1,
  phraseGrammarMode: 'through_composed_arch_no_cadence',
  motifRecurrenceHardFailMin: 0.32,
  badalamentiSignatureIntervalBlend: 0.34,
  authenticCadenceCredit: 0,
  modalEndingsValid: true,
  inconclusiveEndingCredit: 0.16,
  modalCadenceCredit: 0.14,
  chromaticMediantCredit: 0.14,
  codaDissolutionCredit: 0.14,
  jazzExtensionCredit: 0.12,
  bassPedalCredit: 0.12,
  coolJazzModalCredit: 0.1,
  longPhraseBarsMin: 16,
  wallToWallPhrasePenalty: 0,
};

/** Badalamenti SQ — low independence, through-composed arch, mid-register chromatic compression. */
export const BADALAMENTI_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'badalamenti',
  independenceLevel: 'low',
  imitationStyle: 'climactic_synthesis',
  registerPolicy: 'mid_register_chromatic_inner_compression',
  phraseArticulation: 'through_composed_arch_no_cadence',
  dissonanceProfile: {
    allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    forbiddenIntervals: [],
    parallelFifthsAllowed: true,
    parallelOctavesAllowed: false,
    resolveByStep: false,
  },
  preferredImitationTypes: ['free', 'invertible'],
  rhythmicIndependenceRequired: false,
  lineRoleAssignment: 'fixed',
};

export const BADALAMENTI_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'badalamenti',
  contrapuntalLinePolicy: BADALAMENTI_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: BADALAMENTI_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'brookmeyer',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: BADALAMENTI_SQ_GCE_SCORER_ADJUSTMENTS,
  badalamentiThreeTierTexture: BADALAMENTI_THREE_TIER_TEXTURE,
};

/** Merge SQ→BB profile onto film-stub rows (`badalamenti` / `angelo_badalamenti`). */
export function applyBadalamentiFilmStubVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = BADALAMENTI_SQ_VRB_PROFILE;
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
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, 16),
      allowMidBarChange: false,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'diatonic-step',
      maxLeapSemitones: 10,
      preferredIntervalSets: [1, 2, 3, 4, 5, 7],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 4,
      maxSpreadSemitones: 22,
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
