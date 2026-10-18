/**
 * Piano V1.1 Stage D expression.
 * Opt-in. Velocity and written dynamics only. Timing stays on the Stage A grid.
 */

import type { NoteEvent, ScoreModel } from '../score-model/scoreModelTypes';

/** Written marks at phrase boundaries. The same plan drives MIDI velocity. */
export const STAGE_D_WRITTEN: Readonly<Record<number, 'mp' | 'p' | 'f' | 'pp'>> = {
  1: 'mp',
  9: 'mp',
  17: 'p',
  19: 'f',
  21: 'mp',
  24: 'pp',
};

const RH_VELOCITY = [
  64, 64,
  70, 70, 74, 74, 76, 76,
  62, 62,
  74, 74, 76, 76, 72, 72,
  50, 46,
  92, 96,
  68,
  60, 54,
  40,
] as const;

export function stageDVelocity(bar: number, voice: number): number {
  const rh = RH_VELOCITY[bar - 1] ?? 64;
  if (voice === 3) {
    if (bar >= 9 && bar <= 16) return Math.min(100, rh + 8);
    return Math.max(28, rh - 12);
  }
  return rh;
}

export function applyStageDExpression(score: ScoreModel): void {
  score.measureDynamicsMarkings = { ...STAGE_D_WRITTEN };
  for (const measure of score.parts[0]?.measures ?? []) {
    for (const event of measure.events) {
      if (event.kind !== 'note') continue;
      (event as NoteEvent).velocity = stageDVelocity(measure.index, event.voice ?? 1);
    }
  }
}

export function stageDVelocityContour(score: ScoreModel): { rh: number[]; lh: number[] } {
  const rh: number[] = [];
  const lh: number[] = [];
  for (const measure of score.parts[0]?.measures ?? []) {
    const right = measure.events.find((event) => event.kind === 'note' && (event.voice ?? 1) === 1);
    const left = measure.events.find((event) => event.kind === 'note' && (event.voice ?? 1) === 3);
    rh.push(right && right.kind === 'note' ? right.velocity ?? 0 : 0);
    lh.push(left && left.kind === 'note' ? left.velocity ?? 0 : 0);
  }
  return { rh, lh };
}
