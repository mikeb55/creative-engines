/**
 * Guitar–Bass Duo preset ids: standard duo vs single-line duo (shared harmony path, different playback).
 */

export const GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID = 'guitar_bass_duo_single_line' as const;

export function isGuitarBassDuoFamily(presetId: string | undefined): boolean {
  return presetId === 'guitar_bass_duo' || presetId === GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID;
}

/** Song Mode, duo32 long-form opt-in, bar-7 duo lock sweep, duoLock motifs — standard preset only. */
export function isStandardGuitarBassDuo(presetId: string | undefined): boolean {
  return presetId === 'guitar_bass_duo';
}
