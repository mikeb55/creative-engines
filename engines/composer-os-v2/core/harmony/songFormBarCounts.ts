/**
 * Song Mode / Guitar–Bass Duo: allowed chord progression lengths (matches score measure count for custom harmony).
 */

/** Guitar–Bass Duo / Song Mode: chord progression length options (matches score measure count for custom harmony). */
export const SONG_FORM_BAR_OPTIONS = [8, 16, 24, 32, 40, 48, 56, 64] as const;
export type SongFormBarCount = (typeof SONG_FORM_BAR_OPTIONS)[number];

export function isAllowedSongFormBarCount(n: number | undefined): n is SongFormBarCount {
  return (
    n === 8 ||
    n === 16 ||
    n === 24 ||
    n === 32 ||
    n === 40 ||
    n === 48 ||
    n === 56 ||
    n === 64
  );
}

export function clampSongFormBarCount(n: number | undefined, fallback: SongFormBarCount = 32): SongFormBarCount {
  if (isAllowedSongFormBarCount(n)) return n;
  return fallback;
}

/** Duo `custom_locked` pipeline truth: 32–64 long-form (steps of 8). */
export const DUO_LONG_FORM_LOCKED_TRUTH_BAR_COUNTS = [32, 40, 48, 56, 64] as const;
export type DuoLongFormLockedTruthBarCount = (typeof DUO_LONG_FORM_LOCKED_TRUTH_BAR_COUNTS)[number];

export function isDuoLongFormLockedTruthBarCount(n: number): n is DuoLongFormLockedTruthBarCount {
  return (
    n === 32 || n === 40 || n === 48 || n === 56 || n === 64
  );
}
