/**
 * Duo V3.0 swing & phrasing helpers — played feel (syncopation, breathing, interaction).
 */

import type { MeasureModel } from '../score-model/scoreModelTypes';

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

/**
 * Swing feel is articulation / accent only — never duration offsets (Sibelius + import safety).
 * @deprecated Kept for call-site stability; always returns 0.
 */
export function duoGuitarSwingStaggerBump(_seed: number, _bar: number, _isDuo: boolean): number {
  return 0;
}
