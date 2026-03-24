/**
 * Composer OS V2 — Rhythm Engine types
 * Feel, syncopation, subdivision — returns constraints, not final notes.
 */

/** Feel mode. */
export type FeelMode = 'swing' | 'straight' | 'hybrid';

/** Syncopation density. */
export type SyncopationDensity = 'low' | 'medium' | 'high';

/** Feel configuration. */
export interface FeelConfig {
  mode: FeelMode;
  intensity: number; // 0–1
  syncopationDensity: SyncopationDensity;
}

/** Rhythmic behaviour constraints (not final notes). */
export interface RhythmicConstraints {
  mode: FeelMode;
  intensity: number;
  syncopationDensity: SyncopationDensity;
  subdivisionPreference: 'eighth' | 'sixteenth' | 'mixed';
  offbeatWeight: number;
  tripletHint: boolean;
  phraseDisplacementTendency: number; // 0–1
  sustainTendency: number; // 0–1, prefer longer notes
  attackDensityTendency: number; // 0–1, events per bar tendency
}
