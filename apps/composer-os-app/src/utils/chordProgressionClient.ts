/**
 * Shared chord progression parsing for the Generate screen — same entry as the Composer OS API
 * (`parseChordProgressionInput` in engine). Keeps UI preflight validation aligned with backend.
 */

export {
  normalizeChordProgressionSeparators,
  parseChordProgressionInput,
  parseChordProgressionInputWithBarCount,
} from '@composer-os/core/harmony/chordProgressionParser';
