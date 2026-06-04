/**
 * Single source of truth — Song Mode writers eligible for LeadSheet / MusicXML chart-in.
 * Phase 2 (7) + phase 3 (+5). Phase 4 candidates (radiohead, miles_davis, count_basie) not included yet.
 */

export const LEAD_SHEET_SONG_MODE_WRITERS = [
  'donald_fagen',
  'barry_harris',
  'bill_evans',
  'antonio_carlos_jobim',
  'pat_metheny',
  'bacharach',
  'herbie_hancock',
  'wayne_shorter',
  'debussy',
  'duke_ellington',
  'billy_strayhorn',
  'maria_schneider',
  'kenny_wheeler',
  'thelonious_monk',
] as const;

export type LeadSheetSongModeWriterId = (typeof LEAD_SHEET_SONG_MODE_WRITERS)[number];

const LEAD_SHEET_SONG_MODE_WRITER_SET = new Set<string>(LEAD_SHEET_SONG_MODE_WRITERS);

/** True when `primarySongwriterStyle` (normalized or raw) is in the phase 3 LeadSheet writer roster. */
export function isLeadSheetSongModeWriter(primarySongwriterStyle: string | undefined | null): boolean {
  if (primarySongwriterStyle == null) return false;
  const id = primarySongwriterStyle.trim().toLowerCase();
  return id.length > 0 && LEAD_SHEET_SONG_MODE_WRITER_SET.has(id);
}
