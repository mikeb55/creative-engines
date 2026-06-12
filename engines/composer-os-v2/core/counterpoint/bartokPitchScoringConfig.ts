/**
 * Bartok CLE pitch-scoring constants - sole authority: docs/bartok_pitch_spec.md
 */

import type { LineRole } from './abstractLineSet';
import type {
  BartokActiveFunction,
  BartokCollectionId,
  BartokImitationMode,
  CellLibraryEntry,
} from './bartokPitchScoringTypes';

export const BARTOK_PITCH_SHORTLIST_SIZE = 5;
export const BARTOK_PITCH_BEAM_WIDTH = 32;
export const BARTOK_PITCH_TUPLE_COUNT = 625;
export const BARTOK_PITCH_OCTATONIC_LIFT = 0.1;
export const BARTOK_PITCH_OCTATONIC_BASE = 1.18;
export const BARTOK_PITCH_OCTATONIC_DEVELOPMENTAL = 1.28;
export const BARTOK_PITCH_SOPRANO_LEAP_CAP = 5;
export const BARTOK_PITCH_MIN_VERTICAL_GAP = 2;

export const BARTOK_PITCH_ACCENT_STRONG_MULT = 1.1;
export const BARTOK_PITCH_ACCENT_HOOK_MULT = 1.08;
export const BARTOK_PITCH_ACCENT_WEAK_MULT = 1.06;

export const BARTOK_PITCH_SYMMETRIC_BEAT_WEIGHTS = [1.0, 0.32, 0.6, 0.32] as const;

export const BARTOK_PITCH_CELL_LIBRARY: readonly CellLibraryEntry[] = [
  { cellId: 'semitone_wedge', intervals: [1, -1, 2, -2], priorWeight: 0.24, contourClass: 'arch_wedge', isLegacyCell: false },
  { cellId: 'tritone_axis', intervals: [6, -1, -6, 1], priorWeight: 0.22, contourClass: 'pivot_tritone', isLegacyCell: false },
  { cellId: 'minor3_cycle', intervals: [3, 3, 3, -9], priorWeight: 0.18, contourClass: 'rising_cycle', isLegacyCell: false },
  { cellId: 'axis_pivot', intervals: [1, 6, 1, -8], priorWeight: 0.2, contourClass: 'hinge_cell', isLegacyCell: false },
  { cellId: 'legacy_166m7', intervals: [1, 6, 6, -7], priorWeight: 0.16, contourClass: 'step_leap', isLegacyCell: true },
];

export const BARTOK_PITCH_IMITATION_PRIORS: Readonly<Record<BartokImitationMode, number>> = {
  strict_transposition: 0.18,
  strict_interval_cycle: 0.2,
  inversional_imitation: 0.24,
  free_counterpoint_with_motif_echo: 0.26,
  contrary_axis_response: 0.12,
};

export const BARTOK_PITCH_AXIS_FUNCTIONS: readonly BartokActiveFunction[] = [
  'tonic_axis',
  'dominant_axis',
  'subdominant_axis',
];

export const BARTOK_PITCH_AXIS_TRANSITION: Readonly<
  Record<BartokActiveFunction, Readonly<Record<BartokActiveFunction, number>>>
> = {
  tonic_axis: { tonic_axis: 0.35, dominant_axis: 0.4, subdominant_axis: 0.25 },
  dominant_axis: { tonic_axis: 0.35, dominant_axis: 0.35, subdominant_axis: 0.3 },
  subdominant_axis: { tonic_axis: 0.4, dominant_axis: 0.3, subdominant_axis: 0.3 },
};

export type BartokCollectionSpec = {
  id: BartokCollectionId;
  pcs: readonly number[];
  pcWeights: Readonly<Record<number, number>>;
  othersWeight: number;
  baseWeight: number;
};

export const BARTOK_PITCH_COLLECTIONS: readonly BartokCollectionSpec[] = [
  {
    id: 'pentatonic',
    pcs: [0, 2, 4, 7, 9],
    pcWeights: { 0: 1.18, 2: 1.08, 4: 1.06, 5: 0.9, 7: 1.12, 9: 1.06 },
    othersWeight: 0.88,
    baseWeight: 1.0,
  },
  {
    id: 'diatonic',
    pcs: [0, 2, 4, 5, 7, 9, 11],
    pcWeights: { 0: 1.16, 2: 1.04, 4: 1.02, 5: 1.0, 7: 1.1, 9: 1.02, 11: 1.0 },
    othersWeight: 0.9,
    baseWeight: 1.04,
  },
  {
    id: 'lydian_acoustic',
    pcs: [0, 2, 4, 6, 7, 9, 10],
    pcWeights: { 0: 1.18, 2: 1.04, 4: 1.02, 6: 1.12, 7: 1.1, 9: 1.02, 10: 1.0 },
    othersWeight: 0.88,
    baseWeight: 1.12,
  },
  {
    id: 'octatonic',
    pcs: [0, 1, 3, 4, 6, 7, 9, 10],
    pcWeights: { 0: 1.16, 1: 1.06, 3: 1.06, 4: 1.04, 6: 1.1, 7: 1.04, 9: 1.06, 10: 1.04 },
    othersWeight: 0.9,
    baseWeight: 1.18,
  },
];

export const BARTOK_PITCH_VOICE_COLLECTION_BIAS: Readonly<
  Record<LineRole, Readonly<Record<BartokCollectionId, number>>>
> = {
  soprano: { pentatonic: 1.0, diatonic: 1.0, lydian_acoustic: 1.08, octatonic: 1.1 },
  alto: { pentatonic: 1.02, diatonic: 1.04, lydian_acoustic: 1.04, octatonic: 1.04 },
  tenor: { pentatonic: 1.04, diatonic: 1.06, lydian_acoustic: 1.02, octatonic: 1.02 },
  bass: { pentatonic: 1.06, diatonic: 1.08, lydian_acoustic: 1.0, octatonic: 0.98 },
};

export type BartokScorerExponentDim =
  | 'axis'
  | 'collection'
  | 'cell'
  | 'imitation'
  | 'accent'
  | 'vertical'
  | 'contour'
  | 'register';

export const BARTOK_PITCH_VOICE_EXPONENTS: Readonly<
  Record<LineRole, Readonly<Record<BartokScorerExponentDim, number>>>
> = {
  soprano: { axis: 0.22, collection: 0.14, cell: 0.2, imitation: 0.18, accent: 0.06, vertical: 0.08, contour: 0.07, register: 0.05 },
  alto: { axis: 0.24, collection: 0.16, cell: 0.18, imitation: 0.18, accent: 0.08, vertical: 0.08, contour: 0.04, register: 0.04 },
  tenor: { axis: 0.24, collection: 0.16, cell: 0.16, imitation: 0.16, accent: 0.08, vertical: 0.1, contour: 0.04, register: 0.06 },
  bass: { axis: 0.22, collection: 0.18, cell: 0.14, imitation: 0.14, accent: 0.08, vertical: 0.12, contour: 0.04, register: 0.08 },
};

export const BARTOK_PITCH_VOICE_MIDI_RANGE: Readonly<Record<LineRole, { min: number; max: number }>> = {
  soprano: { min: 60, max: 96 },
  alto: { min: 55, max: 91 },
  tenor: { min: 48, max: 79 },
  bass: { min: 36, max: 67 },
};

export const BARTOK_PITCH_LEAP_WINDOW: Readonly<Record<LineRole, number>> = {
  soprano: 5,
  alto: 7,
  tenor: 9,
  bass: 10,
};

export const BARTOK_PITCH_ENSEMBLE_WEIGHTS = {
  verticalIntervalProfile: 0.26,
  axisCoverage: 0.22,
  imitationConsistency: 0.2,
  antiParallelPenalty: 0.18,
  spacingBalance: 0.14,
} as const;

export const BARTOK_PITCH_ENSEMBLE_MULTIPLIERS = {
  exposedParallelPerfect: 0.45,
  sameDirectionPerfectRepetition: 0.62,
  successfulInversionalAnswer: 1.16,
  sonorityThreePlusAxisPcs: 1.14,
  collectionCompletionNonTriad: 1.1,
} as const;

export const BARTOK_PITCH_SUBSTREAM_SALTS = {
  shortlist: 7919,
  beam: 8081,
  axisTransition: 8167,
} as const;

export const BARTOK_PITCH_STRUCTURAL_PRIORITY: Readonly<Record<LineRole, number>> = {
  soprano: 0,
  tenor: 1,
  alto: 2,
  bass: 3,
};

export const BARTOK_PITCH_ADDITIVE_OFFSET: Readonly<Record<LineRole, number>> = {
  soprano: 0,
  alto: 0.125,
  tenor: 0.25,
  bass: 0.375,
};

export const BARTOK_PITCH_TENOR_DELAY_BARS = 1;
export const BARTOK_PITCH_TENOR_PHASE = 1 / 32;
export const BARTOK_PITCH_IMITATION_INTERVAL = -12;
