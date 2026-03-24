/**
 * Composer OS V2 — Motif types
 * Shared data model for melodic/rhythmic motifs.
 */

import type { BarIndex, BeatPosition, BeatDuration, MidiPitch } from './primitiveTypes';

/** Single note event within a motif. */
export interface MotifNote {
  pitch: MidiPitch;
  startBeat: BeatPosition;
  duration: BeatDuration;
}

/** A reusable melodic/rhythmic cell. */
export interface Motif {
  id: string;
  notes: MotifNote[];
  barCount: number;
  variant?: string;
}

/** Motif application state (what has been applied where). */
export interface MotifState {
  activeMotifs: Array<{ motifId: string; startBar: BarIndex }>;
  variants: Record<string, string>;
}
