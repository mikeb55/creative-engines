/**
 * Sonic Youth — v1 chord-event extension schema (compact).
 *
 * PIPELINE / SHARED CODE — null & profile guards (apply wherever ChordEvent flows):
 * - Treat `chordSymbol === null` vs missing vs string explicitly when exporting or merging harmony text.
 * - Before reading `sonicYouth`, narrow with `isSonicYouthEvent` or check `event.sonicYouth != null`; non–Sonic-Youth profiles must not assume these fields exist.
 * - MusicXML export / duo realise passes that iterate `ChordEvent` should skip or branch on `sonicYouth` only when songwriter/profile indicates Sonic Youth (avoid leaking SY metadata into default paths).
 */

/** Six-string open tuning: MIDI pitch classes or MIDI note numbers per string (implementation-defined; keep 6 slots). */
export type SixStringOpenPitches = readonly [number, number, number, number, number, number];

/** Six-string booleans: string rings open vs muted/damped for drone behaviour. */
export type SixStringDroneMask = readonly [boolean, boolean, boolean, boolean, boolean, boolean];

export type NoiseLevel = 'clean' | 'crunchy' | 'feedback' | 'prepared';

export type SYDissonancePreset = 'low_friction' | 'medium_friction' | 'high_friction';

/** Macro texture phase for Sonic Youth dual-guitar material (v1). */
export type SYTextureState = 'riff' | 'shimmer' | 'noise_wall' | 'clearing';

/** Per-guitar compact state for alternate tunings / prepared noise (v1). */
export interface GuitarTuningState {
  tuningId: string;
  openPitches: SixStringOpenPitches;
  shapeId: string;
  /** Fret indices per string for this voicing (length 6; -1 or sentinel = muted if used by caller). */
  fretPattern: readonly number[];
  /** Bitmask or packed int for active strings — caller convention; document in profile. */
  stringMask: number;
  droneStrings: SixStringDroneMask;
  noiseLevel: NoiseLevel;
}

/** Cross-guitar interval clash tallies + friction preset (v1 minimal). */
export interface InterGuitarDissonance {
  /** Normalized friction score 0–1. */
  score: number;
  minor2Count: number;
  major2Count: number;
  tritoneCount: number;
  unisonCount: number;
  preset: SYDissonancePreset;
}

/** Compact Sonic Youth extension hung off `ChordEvent.sonicYouth` (v1). */
export interface SonicYouthExtension {
  guitar1: GuitarTuningState;
  guitar2: GuitarTuningState;
  interGuitarDissonance: InterGuitarDissonance;
  /** Macro phrase texture — pairs with `sonicYouthTextureEngine` / MusicXML augmentation when profile allows. */
  textureState: SYTextureState;
}

/**
 * Maps normalized inter-guitar friction (0–1) to tier presets (v1 — equal thirds).
 * PIPELINE: optional helper when building `InterGuitarDissonance` from a raw score; profile may override buckets.
 */
export function getSYDissonancePreset(score: number): SYDissonancePreset {
  const s = Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0;
  if (s < 1 / 3) return 'low_friction';
  if (s < 2 / 3) return 'medium_friction';
  return 'high_friction';
}
