/**
 * Composer OS V2 — Lock types
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';

export type LockLayer = 'melody' | 'bass' | 'harmony' | 'rhythm' | 'sections';

export interface LockSet {
  melody?: boolean;
  bass?: boolean;
  harmony?: boolean;
  rhythm?: boolean;
  sections?: boolean;
}

export interface LockSnapshot {
  melody?: { partId: string; pitchesByBar: Map<number, number[]> };
  bass?: { partId: string; pitchesByBar: Map<number, number[]> };
  harmony?: { chordByBar: Map<number, string> };
  rhythm?: { startsAndDurationsByBar: Map<number, Array<{ start: number; duration: number }>> };
  sections?: { rehearsalByBar: Map<number, string> };
  /** Score model snapshot for comparison. */
  scoreSnapshot?: string;
}

export interface LockContext {
  locks: LockSet;
  snapshot: LockSnapshot;
}
