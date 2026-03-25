/**
 * Duo V3.0 swing & phrasing helpers — played feel (syncopation, breathing, interaction).
 */

import type { MeasureModel } from '../score-model/scoreModelTypes';
import { seededUnit } from './guitarBassDuoHarmony';

export function qBeatSwing(x: number): number {
  return Math.round(x * 4) / 4;
}

/** Note duration sum in bar (4/4). */
export function guitarNoteCoverageBeats(m: MeasureModel): number {
  let s = 0;
  for (const e of m.events) {
    if (e.kind === 'note') s += (e as { duration: number }).duration;
  }
  return s;
}

/** Bar is “busy” if melody occupies most of the bar (needs breath soon). */
export function guitarBarIsBusy(m: MeasureModel): boolean {
  return guitarNoteCoverageBeats(m) >= 3.0;
}

/** Extra stagger for anticipations / delayed downbeats (swing phrasing). */
export function duoGuitarSwingStaggerBump(seed: number, bar: number, isDuo: boolean): number {
  if (!isDuo) return 0;
  if (seededUnit(seed, bar, 920) >= 0.48) return 0;
  return qBeatSwing(0.25 + seededUnit(seed, bar, 921) * 0.55);
}
