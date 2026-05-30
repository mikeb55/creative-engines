/**
 * V88 practice layer types — etude targets derived from any MusicContext.
 */

import type { MusicContextReceipt } from '../music-context/musicContextTypes';

export type PracticeDifficultyRating = 'easy' | 'medium' | 'hard' | 'advanced';

export type GuideToneLineEntry = {
  barIndex: number;
  chordSymbol: string;
  thirdPc: number;
  seventhPc: number | null;
  /** Semitone motion from previous bar guide-tone anchor (7th or 3rd). */
  voiceLeadingMotion: number | null;
};

export type ScaleRecommendation = {
  chordSymbol: string;
  scale: string;
  rationale: string;
};

export type RhythmicFocus = {
  label: string;
  meter: string;
  bpm: number;
  motifDerived: boolean;
  dominantDurationBeats: number | null;
};

export type PracticeSequenceStep = {
  order: number;
  focus: 'key_center' | 'chord_vocabulary' | 'guide_tone_line' | 'scale_work' | 'rhythm';
  label: string;
  chordSymbols?: readonly string[];
};

export interface PracticeLayer {
  targetChordSymbols: readonly string[];
  guideToneLines: readonly GuideToneLineEntry[];
  scaleRecommendations: readonly ScaleRecommendation[];
  rhythmicFocus: RhythmicFocus;
  difficultyRating: PracticeDifficultyRating;
  practiceSequence: readonly PracticeSequenceStep[];
  provenance: {
    sourceEngineId: 'practice_layer';
    capturedAt: number;
    sourceContextEngineId?: string;
  };
  receipt: MusicContextReceipt;
}

export type PracticeLayerReceiptPayload = {
  chordCount: number;
  guideToneLineLength: number;
  difficultyRating: PracticeDifficultyRating;
  scaleCount: number;
};
