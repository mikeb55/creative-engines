/**
 * Abstract motif layer — symbolic identity (Riffs_Motifs.md §5.1).
 * Motif Engine v2 (Song Mode): `Motif` + `MotifVariant` are the canonical types.
 */

/** Song Mode long-form structural bars (32-bar duo). */
export const SONG_MODE_HOOK_RETURN_BAR = 25;
export const SONG_MODE_MOTIF_BAR_9 = 9;
export const SONG_MODE_MOTIF_BAR_17 = 17;

export type HookContourDirs = number[];

export interface SongModeHookIdentityCell {
  noteCount: number;
  contourDirs: HookContourDirs;
  statementRhythm: { start: number; dur: number }[];
  returnRhythm: { start: number; dur: number }[];
  variationKind: 'rhythm' | 'interval';
  intervalReturnScale: 1 | 2;
}

/** Harmonic/behavioural roles (guide-tone, chromatic approach, etc.). */
export type MotifRoleTag = 'guide-tone' | 'chromatic' | 'chord-tone' | 'passing' | 'neighbor';

/** Register intent (abstract — not MIDI). */
export type MotifRegisterTag = 'low' | 'mid' | 'high' | 'narrow' | 'wide';

/**
 * Core motif: reusable identity cell (intervals + rhythm + contour + tags).
 * intervalPattern length = noteCount - 1; contourPattern same length, -1 | 0 | 1.
 */
export interface CoreMotif {
  id: string;
  /** Ordered semitone steps between consecutive notes. */
  intervalPattern: number[];
  /** One bar @ 4/4, attacks in quarter-beat space. */
  rhythmPattern: { startBeat: number; duration: number }[];
  /** Direction only, one per interval step. */
  contourPattern: number[];
  roleTags: MotifRoleTag[];
  registerTags: MotifRegisterTag[];
}

/** Motif Engine v2 — canonical Song Mode motif. */
export interface MotifAnchor {
  type: 'interval' | 'rhythm' | 'role';
  index: number;
  meta?: unknown;
}

export interface Motif {
  id: string;
  intervals: number[];
  rhythm: { onset: number; duration: number; accent?: boolean }[];
  contour: ('U' | 'D' | 'S')[];
  anchors: MotifAnchor[];
  /** Beat-class / grid positions (quarter-beat space × 4 → eighth grid class). */
  metricPositions: number[];
  lengthBars: number;
}

export interface MotifVariant {
  baseId: string;
  transformType: 'transpose' | 'rhythm' | 'interval' | 'register' | 'truncate' | 'extend';
  similarity: number;
}
