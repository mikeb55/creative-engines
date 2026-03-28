/**
 * Abstract motif layer — symbolic identity (Riffs_Motifs.md §5.1).
 * No instrument/tempo binding; riff realization binds these to concrete lines.
 */

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
