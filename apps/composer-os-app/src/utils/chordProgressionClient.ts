/**
 * Shared chord progression parsing for the Generate screen — same entry as the Composer OS API
 * (`parseChordProgressionInput` in engine). Keeps UI preflight validation aligned with backend.
 */

export {
  normalizeChordProgressionSeparators,
  parseChordProgressionInput,
  parseChordProgressionInputFlexible,
  parseChordProgressionInputWithBarCount,
} from '@composer-os/core/harmony/chordProgressionParser';
export {
  SONG_FORM_BAR_OPTIONS,
  clampSongFormBarCount,
  isAllowedSongFormBarCount,
  type SongFormBarCount,
} from '@composer-os/core/harmony/songFormBarCounts';
