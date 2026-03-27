/**
 * Per-bar activity score for duo interaction (notes + offbeat weighting).
 */

import type { PartModel } from '../score-model/scoreModelTypes';

const HIGH_ACTIVITY = 6;
const EPS = 1e-4;

/** activityScore = distinctAttacks + offbeatAttacks * 0.5 */
export function activityScoreForBar(part: PartModel, barIndex: number): number {
  const m = part.measures.find((x) => x.index === barIndex);
  if (!m) return 0;
  const noteList = m.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { startBeat: number; duration: number; pitch: number })
    .sort((a, b) => a.startBeat - b.startBeat);
  const attackStarts: number[] = [];
  for (let i = 0; i < noteList.length; i++) {
    const cur = noteList[i];
    if (i > 0) {
      const prev = noteList[i - 1];
      if (
        prev.pitch === cur.pitch &&
        Math.abs(prev.startBeat + prev.duration - cur.startBeat) < EPS
      ) {
        continue;
      }
    }
    attackStarts.push(cur.startBeat);
  }
  let offbeats = 0;
  for (const s of attackStarts) {
    const onIntegerBeat = Math.abs(s - Math.round(s)) < 0.06;
    if (!onIntegerBeat) offbeats++;
  }
  return attackStarts.length + offbeats * 0.5;
}

export function activityScoresForPart(part: PartModel, totalBars = 8): number[] {
  const out: number[] = [];
  for (let b = 1; b <= totalBars; b++) {
    out.push(activityScoreForBar(part, b));
  }
  return out;
}

export { HIGH_ACTIVITY };
