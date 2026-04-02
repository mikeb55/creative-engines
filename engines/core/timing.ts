export const DIVISIONS = 4;
export const BEATS_PER_MEASURE = 4;
export const MEASURE_DIVISIONS = DIVISIONS * BEATS_PER_MEASURE;

import type { CanonicalChord } from './canonicalChord';

export type NoteEvent = {
  pitch: number;
  duration: number;
  voice: number;
};

export type Measure = {
  index: number;
  voices: Record<number, NoteEvent[]>;
  /** Lead-sheet chord for MusicXML <harmony> at beat 1 (e.g. Wyble progression). */
  chordSymbol?: string;
  /** When set, MusicXML harmony uses this (no re-parse drift). */
  canonicalChord?: CanonicalChord;
};

export type Score = {
  measures: Measure[];
};
