/**
 * Default and resolved score titles for MusicXML / score model (not demo strings).
 */

import type { EcmChamberMode } from '../core/ecm/ecmChamberTypes';
import {
  GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID,
  isGuitarBassDuoFamily,
} from '../core/presets/guitarBassDuoPresetIds';
import { resolveComposerDisplayName } from './composerDisplayNameRegistry';

/** Default when user omits title for Guitar–Bass Duo preset. */
export const DEFAULT_GUITAR_BASS_DUO_SCORE_TITLE = 'Guitar-Bass Duo Study';

export const DEFAULT_ECM_METHEENY_TITLE = 'ECM Chamber — Metheny Quartet Study';
export const DEFAULT_ECM_SCHNEIDER_TITLE = 'ECM Chamber — Schneider Study';

const MAX_TITLE_LEN = 200;

/** Default Song Mode study title when user omits `title` (manifest display name + seed). */
export function resolveSongModeStudyTitle(
  primarySongwriterStyle: string | undefined | null,
  seed: number
): string {
  const trimmed =
    typeof primarySongwriterStyle === 'string' ? primarySongwriterStyle.trim() : '';
  if (!trimmed) return `Song Mode Study ${seed}`;
  return `${resolveComposerDisplayName(trimmed)} Study ${seed}`;
}

/**
 * User-provided title wins; otherwise preset-specific default; then generic Composer OS label.
 */
export function resolveScoreTitleForPreset(
  presetId: string,
  userTitle?: string,
  ecmMode?: EcmChamberMode
): string {
  const t = userTitle?.trim();
  if (t) return t.slice(0, MAX_TITLE_LEN);
  if (isGuitarBassDuoFamily(presetId)) {
    return presetId === GUITAR_BASS_DUO_SINGLE_LINE_PRESET_ID
      ? 'Guitar–Bass Duo (Single-Line) Study'
      : DEFAULT_GUITAR_BASS_DUO_SCORE_TITLE;
  }
  if (presetId === 'ecm_chamber') {
    return ecmMode === 'ECM_SCHNEIDER_CHAMBER' ? DEFAULT_ECM_SCHNEIDER_TITLE : DEFAULT_ECM_METHEENY_TITLE;
  }
  return 'Composer OS';
}
