/**
 * Pitch-field spine — parallel harmonic substrate to chord-symbol spine.
 */

export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** Messiaen modes of limited transposition (1–7). */
export type MessiaenModeId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type IntervalWeight = {
  semitones: number;
  weight: number;
};

export type VoicePitchOverlay = {
  voiceId: string;
  overlapWithParent: number;
  allowedPcBias?: Array<{ pc: PitchClass; weight: number }>;
  suppressedPcs?: PitchClass[];
  preferredIntervals?: IntervalWeight[];
  registerCenterMidi?: number;
  registerSpread?: number;
};

export type PitchFieldTransition = {
  carryPcs?: PitchClass[];
  mutationStrength: number;
  pivotPcs?: PitchClass[];
};

export type PitchFieldRegion = {
  id: string;
  startBar: number;
  endBar: number;
  parentPcSet: PitchClass[];
  parentWeights?: Array<{ pc: PitchClass; weight: number }>;
  intervalPool: IntervalWeight[];
  anchorPcs?: PitchClass[];
  gravityCenterPc?: PitchClass;
  densityTarget?: number;
  tensionTarget?: number;
  voiceOverlays: VoicePitchOverlay[];
  transitionOut?: PitchFieldTransition;
  phraseLeaderVoiceId?: string;
  interactionVolatility?: number;
  headReferenceStrength?: number;
  /** Coltrane late — interval-cell generator tier. */
  cellGenerator?: 'trichord' | 'hexachord';
  /** Coltrane — semitones advanced per region boundary. */
  transpositionCycle?: number;
  /** Coltrane — pattern-density drive (0–1). */
  densityDrive?: number;
  /** Messiaen — limited-transposition mode id. */
  modeId?: MessiaenModeId;
  /** Messiaen — pedal sustain policy. */
  pedalPolicy?: 'bass-drone' | 'inner-sustain' | 'none';
  /** Messiaen — additive rhythmic cell layer. */
  rhythmicCellEnabled?: boolean;
};

export type PitchFieldSpine = {
  id: string;
  composerVrbId: string;
  regions: PitchFieldRegion[];
  defaultOverlapPolicy: 'shared-parent' | 'semi-independent' | 'high-divergence';
  fieldRhythmUnit: 'bar' | 'half-bar' | 'phrase';
};

export type HarmonicSubstrate = 'chord-spine' | 'pitch-field-spine';

export type ResolvedPitchField = {
  allowedPcs: Array<{ pc: PitchClass; weight: number }>;
  preferredIntervals: IntervalWeight[];
  registerCenterMidi?: number;
  registerSpread?: number;
  regionId: string;
};
