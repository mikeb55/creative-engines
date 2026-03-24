/**
 * Default and resolved score titles for MusicXML / score model (not demo strings).
 */

/** Default when user omits title for Guitar–Bass Duo preset. */
export const DEFAULT_GUITAR_BASS_DUO_SCORE_TITLE = 'Guitar-Bass Duo Study';

const MAX_TITLE_LEN = 200;

/**
 * User-provided title wins; otherwise preset-specific default; then generic Composer OS label.
 */
export function resolveScoreTitleForPreset(presetId: string, userTitle?: string): string {
  const t = userTitle?.trim();
  if (t) return t.slice(0, MAX_TITLE_LEN);
  if (presetId === 'guitar_bass_duo') return DEFAULT_GUITAR_BASS_DUO_SCORE_TITLE;
  return 'Composer OS';
}
