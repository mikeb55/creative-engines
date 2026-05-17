/**
 * Ennio Morricone film stub — SQ→BB Harmonic Voice profile.
 * The Mission / Once Upon a Time in the West / Cinema Paradiso / America research baseline.
 * Normative rules: Session Morricone VRB prompt (not general film-scoring defaults).
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';
import type {
  SqContrapuntalLinePolicy,
  SqVrbChordVocabularyTag,
  SqVrbGceScorerAdjustments,
  SqVrbProfile,
} from './sqVrbProfileTypes';

/** Pedal point may sustain up to 8 bars without GCE harmonic-economy penalty. */
export const MORRICONE_PEDAL_POINT_VALID_BARS = 8;

export const MORRICONE_SQ_CHORD_VOCABULARY: readonly SqVrbChordVocabularyTag[] = [
  'modal_aeolian',
  'modal_dorian',
  'modal_phrygian',
  'modal_mixolydian',
  'chromatic_median_bIII',
  'chromatic_median_bVI',
  'chromatic_median_bII',
  'aeolian_cadence_bVI_bVII_i',
  'spaghetti_half_cadence_bIII_V',
  'triad_skeleton',
  'add9_add6_add11_surface',
  'dominant_pedal',
  'tonic_pedal',
  'bass_drone_fifth',
] as const;

export const MORRICONE_SQ_GCE_SCORER_ADJUSTMENTS: SqVrbGceScorerAdjustments = {
  registerCohesionStdevCeilingSt: 22,
  motifRecurrenceWeight: 0.36,
  intervalEconomyWeight: 0.14,
  registerCohesionWeight: 0.22,
  phraseCellBarsMin: 6,
  phraseCellBarsMax: 32,
  phrasePeriodBars: 0,
  cyclicMotifReturnBoost: 0.08,
  phraseGrammarMode: 'folk_modal_suspended',
  motifRecurrenceHardFailMin: 0.3,
  morriconeSignatureIntervalBlend: 0.32,
  longPhraseBarsMin: 8,
  inconclusiveEndingCredit: 0.14,
  modalCadenceCredit: 0.12,
};

/** Morricone SQ — melody-sovereign, low layer independence, folk-modal suspended arches. */
export const MORRICONE_SQ_CONTRAPUNTAL_LINE_POLICY: SqContrapuntalLinePolicy = {
  enabled: true,
  vrbId: 'morricone',
  independenceLevel: 'low',
  imitationStyle: 'climactic_synthesis',
  registerPolicy: 'lyrical_arch',
  phraseArticulation: 'folk_modal_suspended',
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

export const MORRICONE_SQ_VRB_PROFILE: SqVrbProfile = {
  vrbId: 'morricone',
  contrapuntalLinePolicy: MORRICONE_SQ_CONTRAPUNTAL_LINE_POLICY,
  chordVocabulary: MORRICONE_SQ_CHORD_VOCABULARY,
  bestBbStyle: 'schneider',
  secondaryBbStyle: 'mingus',
  cautionBbStyle: 'basie',
  gceScorerAdjustments: MORRICONE_SQ_GCE_SCORER_ADJUSTMENTS,
  pedalPointValidBars: MORRICONE_PEDAL_POINT_VALID_BARS,
  morriconeRomanticModeAvailable: true,
};

/** Merge SQ→BB profile onto the film-stub VoiceRuleBundle row (`morricone` / `ennio_morricone`). */
export function applyMorriconeFilmStubVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  const p = MORRICONE_SQ_VRB_PROFILE;
  return {
    ...bundle,
    contrapuntalLinePolicy: p.contrapuntalLinePolicy,
    bestBbStyle: p.bestBbStyle,
    secondaryBbStyle: p.secondaryBbStyle,
    cautionBbStyle: p.cautionBbStyle,
    sqChordVocabulary: [...p.chordVocabulary],
    sqVrbProfileId: p.vrbId,
    pedalPointValidBars: p.pedalPointValidBars,
    morriconeRomanticModeAvailable: p.morriconeRomanticModeAvailable,
    harmonicRhythm: {
      ...bundle.harmonicRhythm,
      minChordDurationBars: 1,
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, p.pedalPointValidBars ?? 8),
      allowMidBarChange: false,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'diatonic-step',
      maxLeapSemitones: 12,
      preferredIntervalSets: [2, 3, 5, 7],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 4,
      maxSpreadSemitones: 28,
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
        rhythmicIndependenceFloor: 0.42,
        registerInterlock: true,
        intervalPreference: 'diatonic',
      }),
      rhythmicIndependenceFloor: 0.42,
      intervalPreference: 'diatonic',
    },
  };
}
