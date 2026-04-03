/**
 * Late-form closing slice (32-bar): bars ≥24 — anti-plateau nudges without touching validation or UI.
 */

import type { CompositionContext } from '../compositionContext';
import { normalizeChordToken } from '../harmony/chordProgressionParser';
import { getChordForBar } from '../harmony/harmonyResolution';

/** Final third of a 32-bar form: A″ return and closing cadence. */
export function isLateClosingSlice(bar: number, totalBars: number): boolean {
  return totalBars >= 32 && bar >= 24;
}

/** How many consecutive bars ending at `bar` share the same normalized chord symbol. */
export function consecutiveChordStreakEndingAtBar(context: CompositionContext, bar: number): number {
  const cur = normalizeChordToken(getChordForBar(bar, context));
  let streak = 1;
  for (let i = bar - 1; i >= 1; i--) {
    if (normalizeChordToken(getChordForBar(i, context)) === cur) streak++;
    else break;
  }
  return streak;
}
