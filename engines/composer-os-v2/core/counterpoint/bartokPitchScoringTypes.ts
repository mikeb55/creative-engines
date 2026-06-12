/**
 * Bartok CLE pitch-scoring types - docs/bartok_pitch_spec.md
 */

import type { LineRole } from './abstractLineSet';
export type BartokActiveFunction = 'tonic_axis' | 'dominant_axis' | 'subdominant_axis';

export type BartokCollectionId = 'pentatonic' | 'diatonic' | 'lydian_acoustic' | 'octatonic';

export type BartokImitationMode =
  | 'strict_transposition'
  | 'strict_interval_cycle'
  | 'inversional_imitation'
  | 'free_counterpoint_with_motif_echo'
  | 'contrary_axis_response';

export type BartokTransformationKind =
  | 'inversional'
  | 'contrary_axis'
  | 'interval_cycle'
  | 'transposition'
  | 'motif_echo'
  | 'neutral'
  | 'parallel_penalty';

export type BartokCellContourClass =
  | 'arch_wedge'
  | 'pivot_tritone'
  | 'rising_cycle'
  | 'hinge_cell'
  | 'step_leap';

export type CellLibraryEntry = {
  cellId: string;
  intervals: readonly number[];
  priorWeight: number;
  contourClass: BartokCellContourClass;
  isLegacyCell: boolean;
};

export type BartokPitchSlotKind = 'soprano_quarter' | 'alto_bar' | 'bass_bar';

export type BartokPitchScoringSlotRef = {
  globalSlotIndex: number;
  barIndex: number;
  beatIndexInBar: number;
  slotInPhrase: number;
  phraseIndex: number;
  kind: BartokPitchSlotKind;
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

export type BartokVoiceDimensionScores = Readonly<Record<BartokScorerExponentDim, number>>;

export type BartokPitchCandidateTrace = {
  role: LineRole;
  candidateMidi: number;
  shortlistRank: number;
  voiceScore: number;
  dimensions: BartokVoiceDimensionScores;
  tieBreakKey: number;
};

export type BartokPitchTupleTrace = {
  slot: BartokPitchScoringSlotRef;
  candidates: readonly BartokPitchCandidateTrace[];
  tupleCount: number;
  beamWidth: number;
  finalScore: number;
  ensembleFactors: Readonly<Record<string, number>>;
  chosenMidiByRole: Readonly<Record<LineRole, number>>;
  activeFunction: BartokActiveFunction;
  collectionId: BartokCollectionId;
  cellId: string;
  phraseImitationMode: BartokImitationMode;
  sourceMotifInterval: number | null;
  transformationByRole: Readonly<Partial<Record<'alto' | 'bass', BartokTransformationKind>>>;
  /** Validation probe — omitted from golden serialize. */
  marginVsNonTransformational?: number;
};

export type BartokPitchScoringTrace = {
  seed: number;
  lengthBars: number;
  styleSourceVrbId: 'bartok';
  /** Phrase 0 mode (legacy field); see phraseImitationModes for per-phrase picks. */
  imitationMode: BartokImitationMode;
  phraseImitationModes: readonly BartokImitationMode[];
  slots: BartokPitchTupleTrace[];
  phraseAxisStreak: number;
};
