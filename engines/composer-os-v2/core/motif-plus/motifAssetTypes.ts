/**
 * Portable motif assets for reuse planning (metadata — not score events).
 */

export type MotifReuseTargetMode =
  | 'song_mode'
  | 'ecm_chamber'
  | 'guitar_bass_duo'
  | 'big_band'
  | 'string_quartet';

export interface MotifRhythmPattern {
  /** Relative durations (quarter = 1). */
  durations: number[];
}

export interface MotifAsset {
  id: string;
  source: 'generated' | 'internal' | 'imported';
  intervalContour: number[];
  rhythmPattern: MotifRhythmPattern;
  repetitionProfile: 'low' | 'medium' | 'high';
  sectionPlacement: Array<{ label: string; startBar: number }>;
  barCount: number;
}

export interface MotifReuseSuggestion {
  assetId: string;
  targetMode: MotifReuseTargetMode;
  role: 'hook' | 'development' | 'riff_seed' | 'quartet_variation';
  note: string;
}
