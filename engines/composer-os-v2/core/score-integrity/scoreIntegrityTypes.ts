/**
 * Composer OS V2 — Score integrity types
 */

/** Bar/measure structure for validation. */
export interface BarForValidation {
  index: number;
  duration: number; // beats
  voices?: Array<{ duration: number }>;
}

/** Chord symbol for validation. */
export interface ChordSymbolForValidation {
  bar: number;
  chord: string;
}

/** Rehearsal mark for validation. */
export interface RehearsalMarkForValidation {
  bar: number;
  label: string;
}
