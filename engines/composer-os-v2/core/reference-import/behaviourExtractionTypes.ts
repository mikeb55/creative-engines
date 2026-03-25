/**
 * Behavioural profile distilled from a ReferencePiece (guidance, not a score clone).
 */

export type ReferenceFormArc = 'stable' | 'through_composed' | 'sectional' | 'unknown';

export type ReferenceDensityBand = 'sparse' | 'medium' | 'dense';

export interface ReferenceBehaviourProfile {
  formArc: ReferenceFormArc;
  densityBand: ReferenceDensityBand;
  /** Max − min MIDI across sampled material. */
  registerSpreadMidi: number;
  /** Typical chord length in bars (0 if unknown). */
  harmonicRhythmBars: number;
  /** Short interval contour sample (semitones). */
  motifContourSample: number[];
  /** Heuristic cadence / phrase boundary density 0–1. */
  cadenceDensity: number;
  warnings: string[];
}
