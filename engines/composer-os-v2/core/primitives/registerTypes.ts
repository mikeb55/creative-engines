/**
 * Composer OS V2 — Register types
 * Shared data model for pitch register zones.
 */

import type { MidiPitch } from './primitiveTypes';

/** Register zone: [low, high] MIDI inclusive. */
export type RegisterZone = [MidiPitch, MidiPitch];

/** Map of register zones by role. */
export interface RegisterMap {
  melody?: RegisterZone;
  bass?: RegisterZone;
  harmony?: RegisterZone;
  /** Per-instrument overrides. */
  byInstrument?: Record<string, RegisterZone>;
}
