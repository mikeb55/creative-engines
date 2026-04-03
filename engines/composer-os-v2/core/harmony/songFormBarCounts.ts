/**
 * Song Mode / Guitar–Bass Duo: allowed chord progression lengths (matches score measure count for custom harmony).
 */

export const SONG_FORM_BAR_OPTIONS = [8, 16, 32] as const;
export type SongFormBarCount = (typeof SONG_FORM_BAR_OPTIONS)[number];

export function isAllowedSongFormBarCount(n: number | undefined): n is SongFormBarCount {
  return n === 8 || n === 16 || n === 32;
}

export function clampSongFormBarCount(n: number | undefined, fallback: SongFormBarCount = 32): SongFormBarCount {
  if (isAllowedSongFormBarCount(n)) return n;
  return fallback;
}
