import type { CompositionContext } from '../compositionContext';
import type { EmotionalDrift, ReharmApproach } from './reharmCandidateEngine';

/**
 * Timed locked melody/bass event for passage reharm (Stage I1).
 * Timing: `onset` / `dur` in **quarter notes**, **passage-relative**
 * (`onset === 0` = downbeat of `startBar`). Negative `onset` = note
 * sustained into the passage. Compatibility filters do not consume these yet.
 */
export type ReharmLockedEvent = {
  /** Explicit part: guitar melody (never guitar-accomp) or bass. */
  part: 'melody' | 'bass';
  kind: 'note' | 'rest';
  /** Pitch class 0–11; null for rests. */
  pc: number | null;
  /** MIDI pitch 0–127; null for rests. */
  midi?: number | null;
  /** Quarter-note onset relative to passage start (may be negative). */
  onset: number;
  /** Quarter-note duration of the sounding (tie-merged) event. */
  dur: number;
  /** Sounding began before the passage (or before this event’s local attack). */
  tieIn: boolean;
  /** Sounding continues past the passage end. */
  tieOut: boolean;
  /** 1-based absolute bar where the event first sounds inside the passage. */
  bar: number;
  /** Metre label at that bar when known (e.g. `"4/4"`). */
  metre?: string;
};

export type ReharmSequenceRequest = {
  context: CompositionContext;
  startBar: number;
  endBar: number;
  /** 1–3 songwriter style ids (passed to {@link buildReharmLensConfig}). */
  lensIds: string[];
  /**
   * Optional per-bar melody pitch classes (aligned to **startBar…endBar**); entries may be null.
   * Callers typically supply first-note-per-bar samples — not a claim of all-event melody/bass fit.
   */
  melodyPcs?: (number | null)[];
  /**
   * Optional timed locked melody/bass events (passage-relative quarters).
   * Accepted and forwarded; generators do not filter on them yet. Keep {@link melodyPcs} for back-compat.
   */
  lockedEvents?: ReharmLockedEvent[];
  drift?: EmotionalDrift;
  seed?: number;
  /**
   * `lens` (default): one progression per lens id.
   * `contrasting`: up to three approach-tagged progressions with source/pairwise distance gates.
   */
  selectionMode?: 'lens' | 'contrasting';
};

export type AlternativeBar = {
  barIndex: number;
  originalSymbol: string;
  substituteChordTypeId: string;
  substituteRootPc: number;
  strategy: string;
  mappingNull: boolean;
};

export type AlternativeProgression = {
  lensId: string;
  bars: AlternativeBar[];
  /** Placeholder mean combined-rank score (0–10) until full GCE wiring. */
  gceScore?: number;
  /** Present on contrasting-mode alternatives. */
  approach?: ReharmApproach;
};

export type ReharmResult = {
  alternatives: AlternativeProgression[];
  requestedLens: string[];
  startBar: number;
  endBar: number;
  seed: number;
  /**
   * Set when contrasting mode cannot return three valid, substantially distant alternatives.
   * Absent when selectionMode is `lens` or when three pass.
   */
  shortfall?: string;
};
