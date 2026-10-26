/**
 * Metre helpers for long-line practice.
 * Span is always in quarter-note lengths (MusicXML / score-model convention).
 */

import type { LongLineMeter } from './types';

/** Bar length in quarter-lengths: (beats * 4) / beatType. */
export function longLineMeterSpanQuarters(meter: LongLineMeter): number {
  if (!(meter.beats > 0) || !(meter.beatType > 0)) {
    throw new Error('long-line-practice: invalid meter');
  }
  return (meter.beats * 4) / meter.beatType;
}

export function isSameLongLineMeter(a: LongLineMeter | null | undefined, b: LongLineMeter | null | undefined): boolean {
  if (!a || !b) return a === b;
  return a.beats === b.beats && a.beatType === b.beatType;
}
