/**
 * Treble solo concert-pitch range for Sibelius-safe export (C4–G6).
 */

export const SOLO_TREBLE_MIN_MIDI = 60;
export const SOLO_TREBLE_MAX_MIDI = 91;

/** Clamp concert MIDI to treble solo range with octave wrap. */
export function clampSoloTrebleConcertMidi(midi: number): number {
  let pitch = Math.round(Number(midi));
  if (!Number.isFinite(pitch)) return SOLO_TREBLE_MIN_MIDI;
  while (pitch < SOLO_TREBLE_MIN_MIDI) pitch += 12;
  while (pitch > SOLO_TREBLE_MAX_MIDI) pitch -= 12;
  return Math.max(SOLO_TREBLE_MIN_MIDI, Math.min(SOLO_TREBLE_MAX_MIDI, pitch));
}
