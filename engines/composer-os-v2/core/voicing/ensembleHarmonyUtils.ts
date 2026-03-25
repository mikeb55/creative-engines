/**
 * Chord root → MIDI helpers for ensemble voicing (behavioural, not theory-complete).
 */

import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';

const ROOT_RE = /^([A-G](?:#|b)?)/i;

/** Pitch class 0–11 from chord symbol (harmony part only). */
export function chordSymbolRootPc(symbol: string): number | undefined {
  const p = parseChordSymbol(symbol);
  const m = p.harmonyPart.trim().match(ROOT_RE);
  if (!m) return undefined;
  return noteNameToPitchClass(m[1]);
}

/** Snap MIDI note into [lo, hi] by octave shifts. */
export function snapMidiToRange(midi: number, lo: number, hi: number): number {
  let m = midi;
  while (m < lo) m += 12;
  while (m > hi) m -= 12;
  return Math.max(lo, Math.min(hi, m));
}
