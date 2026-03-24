/**
 * Per-bar activity score for duo interaction (notes + offbeat weighting).
 */

import type { PartModel } from '../score-model/scoreModelTypes';

const HIGH_ACTIVITY = 6;

/** activityScore = noteCount + offbeatNotes * 0.5 */
export function activityScoreForBar(part: PartModel, barIndex: number): number {
  const m = part.measures.find((x) => x.index === barIndex);
  if (!m) return 0;
  let notes = 0;
  let offbeats = 0;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    notes++;
    const s = (e as { startBeat: number }).startBeat;
    const onIntegerBeat = Math.abs(s - Math.round(s)) < 0.06;
    if (!onIntegerBeat) offbeats++;
  }
  return notes + offbeats * 0.5;
}

export function activityScoresForPart(part: PartModel, totalBars = 8): number[] {
  const out: number[] = [];
  for (let b = 1; b <= totalBars; b++) {
    out.push(activityScoreForBar(part, b));
  }
  return out;
}

export { HIGH_ACTIVITY };
