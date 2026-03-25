/**
 * Lyric / prosody planning — slots and stress, not final lyrics.
 */

export type StressCell = 'S' | 'w';

export interface ProsodyLinePlaceholder {
  phraseId: string;
  /** Syllable counts per bar line (planning). */
  syllableSlots: number[];
  stressPattern: StressCell[];
  emotionalContourTag: 'intimate' | 'lift' | 'resolve' | 'tension';
}

export interface ProsodyPlaceholderPlan {
  lines: ProsodyLinePlaceholder[];
  /** Which author lens weights prosody most (from overlay). */
  authorAlignment: 'pat_pattison' | 'jimmy_webb' | 'jack_perricone' | 'none';
  /** 0–1 rough alignment of melodic peaks to stressed slots. */
  melodicStressAlignmentScore: number;
}
