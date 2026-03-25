/**
 * Singer tessitura — planning constraints for lead melody (not audio).
 */

import type { SongVoiceType } from './songModeTypes';

/** Maps 1:1 to `SongVoiceType` profiles in `singerRangeProfiles`. */
export type SingerProfileId = SongVoiceType;

export interface SingerRangeProfile {
  id: SingerProfileId;
  /** Comfortable singing range (MIDI). */
  comfortRangeMidi: [number, number];
  /** Absolute extremes allowed for peaks (still validated). */
  absoluteRangeMidi: [number, number];
  /** Chorus may sit a few semitones higher than verse — cap lift. */
  maxChorusLiftSemitones: number;
}

export interface SingerRangeValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  peakMidi: number;
  lowMidi: number;
}
