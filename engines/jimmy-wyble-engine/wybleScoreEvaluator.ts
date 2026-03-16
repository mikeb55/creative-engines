/**
 * Simple scoring for Wyble Score (measure-first output).
 */

import type { Score } from '../../shared/scoreModel';

/** Score based on rhythmic variety and voice balance. */
export function scoreWybleMeasureFirst(score: Score): number {
  let s = 8;
  const upperEvents = score.measures.flatMap((m) =>
    m.voices.filter((v) => v.voice === 1).flatMap((v) => v.events.filter((e) => e.pitch > 0))
  );
  const lowerEvents = score.measures.flatMap((m) =>
    m.voices.filter((v) => v.voice === 2).flatMap((v) => v.events.filter((e) => e.pitch > 0))
  );
  if (upperEvents.length > 0 && lowerEvents.length > 0) s += 0.5;
  const durations = new Set(score.measures.flatMap((m) => m.voices.flatMap((v) => v.events.map((e) => e.duration))));
  if (durations.size > 2) s += 0.5;
  return Math.min(10, s);
}
