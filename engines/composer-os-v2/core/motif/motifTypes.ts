/**
 * Composer OS V2 — Motif types
 */

import type { MidiPitch } from '../primitives/primitiveTypes';

export interface MotifNote {
  pitch: MidiPitch;
  startBeat: number;
  duration: number;
}

export interface BaseMotif {
  id: string;
  notes: MotifNote[];
  barCount: number;
}

export type MotifVariant = 'original' | 'transposed' | 'rhythm_shift' | 'inversion_lite';

export interface PlacedMotif {
  motifId: string;
  startBar: number;
  variant: MotifVariant;
  notes: MotifNote[]; // actual placed notes (transposed/transformed)
}

export interface MotifTrackerState {
  baseMotifs: BaseMotif[];
  placements: PlacedMotif[];
}
