/**
 * Composer OS V2 — Shared primitive types
 * Data model only; no generation logic.
 */

/** MIDI pitch (21–108 typical). */
export type MidiPitch = number;

/** Beat position within a measure (0–4 for 4/4). */
export type BeatPosition = number;

/** Duration in beats. */
export type BeatDuration = number;

/** Bar index (1-based). */
export type BarIndex = number;

/** Unique identifier for a section, phrase, or module. */
export type Id = string;

/** 0–1 normalized intensity. */
export type Intensity = number;
