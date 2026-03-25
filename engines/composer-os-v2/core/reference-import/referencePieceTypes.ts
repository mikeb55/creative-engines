/**
 * Shared reference-piece contract — behavioural extraction, not engraving fidelity.
 */

import type { ImportSourceKind } from './importSourceTypes';

export interface ReferenceSectionSlice {
  label: string;
  startBar: number;
  barCount: number;
}

export interface ReferenceChordSegment {
  chord: string;
  startBar: number;
  bars: number;
}

export interface ReferencePitchSummary {
  minMidi: number;
  maxMidi: number;
  noteCount: number;
}

/** Sparse note sample for contour / rhythm heuristics. */
export interface ReferenceNoteSample {
  midi: number;
  /** 1-based bar index (approximate for MIDI). */
  barApprox: number;
  beatInBar: number;
}

/**
 * One unified reference snapshot after any adapter/parser.
 * `partial` + `warnings` when import is degraded but usable.
 */
export interface ReferencePiece {
  sourceKind: ImportSourceKind;
  title?: string;
  totalBars: number;
  sections: ReferenceSectionSlice[];
  chordSegments: ReferenceChordSegment[];
  rehearsalMarks: Array<{ label: string; bar: number }>;
  pitchByPart: Record<string, ReferencePitchSummary>;
  noteSamples: ReferenceNoteSample[];
  /** Harmonic rhythm hint: average chord length in bars (0 if unknown). */
  harmonicRhythmBars: number;
  warnings: string[];
  partial: boolean;
}
