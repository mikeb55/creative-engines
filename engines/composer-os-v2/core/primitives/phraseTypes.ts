/**
 * Composer OS V2 — Phrase types
 * Shared data model for phrase structure.
 */

import type { BarIndex } from './primitiveTypes';

/** Section or phrase label. */
export type PhraseLabel =
  | 'intro'
  | 'A'
  | 'B'
  | 'C'
  | 'bridge'
  | 'solo'
  | 'outro'
  | 'head'
  | string;

/** One phrase or section in the form. */
export interface PhraseSegment {
  label: PhraseLabel;
  startBar: BarIndex;
  length: number;
  density?: 'sparse' | 'medium' | 'dense';
}

/** Plan of phrases across the composition. */
export interface PhrasePlan {
  segments: PhraseSegment[];
  totalBars: number;
}
