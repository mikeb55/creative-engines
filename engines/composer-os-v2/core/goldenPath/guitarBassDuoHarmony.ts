/**
 * Guitar–Bass Duo golden path — chord tones and guide-tone helpers (harmonic clarity, register-safe).
 */

export interface ChordToneSet {
  root: number;
  third: number;
  fifth: number;
  seventh: number;
}

/** Seeded 0..1 for bar-local decisions (deterministic). */
export function seededUnit(seed: number, bar: number, salt = 0): number {
  let s = (seed * 7919 + bar * 104729 + salt * 503) >>> 0;
  s = (s * 1103515245 + 12345) >>> 0;
  return s / 0xffffffff;
}

/** Golden-path chord symbols → MIDI bass-register reference tones (same as legacy CHORD_ROOTS). */
export function chordTonesForGoldenChord(chord: string): ChordToneSet {
  switch (chord) {
    case 'Dmin9':
      return { root: 38, third: 41, fifth: 45, seventh: 48 };
    case 'G13':
      return { root: 43, third: 47, fifth: 50, seventh: 42 };
    case 'Cmaj9':
      return { root: 36, third: 40, fifth: 43, seventh: 48 };
    case 'A7alt':
      return { root: 45, third: 49, fifth: 52, seventh: 44 };
    default:
      return { root: 40, third: 44, fifth: 47, seventh: 46 };
  }
}

export function clampPitch(pitch: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, pitch));
}

/** Half-step approach from below into target (short bass colour). */
export function approachFromBelow(target: number, low: number, high: number): number {
  return clampPitch(target - 1, low, high);
}

/** Strong chord tone for guide-tone line: prefer 3rd or 7th. */
export function pickGuideTone(t: ChordToneSet, bar: number, seed: number): number {
  const u = seededUnit(seed, bar, 11);
  return u < 0.55 ? t.third : t.seventh;
}
