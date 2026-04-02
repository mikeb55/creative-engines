/**
 * Jimmy Wyble legacy Score (`engines/core/timing`): exact 4/4 per voice per measure in divisions.
 * Mirrors the contract of `duoBarMathFinalize.rebuildMonophonicVoiceLine` / `measureDurationByVoice`:
 * each voice is an independent timeline summing to MEASURE_DIVISIONS (no cross-voice summing).
 */

import type { Measure, NoteEvent } from './timing';
import { MEASURE_DIVISIONS } from './timing';

const EPS = 1e-6;

/**
 * Map beat-length segments (sum = one 4/4 bar in beats) to integer divisions summing to `totalDiv`.
 * Largest-remainder so rounding error does not under/over fill the measure.
 */
export function allocateBeatDurationsToDivisions(
  durationsBeats: number[],
  totalDiv: number = MEASURE_DIVISIONS
): number[] {
  if (durationsBeats.length === 0) return [totalDiv];
  const totalBeats = durationsBeats.reduce((a, b) => a + b, 0);
  if (totalBeats <= EPS) return [totalDiv];
  const raw = durationsBeats.map((d) => (d / totalBeats) * totalDiv);
  const floored = raw.map((x) => Math.floor(x));
  let rem = totalDiv - floored.reduce((a, b) => a + b, 0);
  const order = raw
    .map((x, i) => ({ i, f: x - floored[i] }))
    .sort((a, b) => b.f - a.f);
  const out = [...floored];
  for (let k = 0; k < rem; k++) {
    out[order[k % order.length]!.i]++;
  }
  return out;
}

/** Same grouping idea as `scoreModelValidation.measureDurationByVoice` — per-voice duration sums. */
export function measureDivisionsByVoice(measure: Measure): Map<number, number> {
  const byVoice = new Map<number, number>();
  for (const vk of Object.keys(measure.voices)) {
    const v = Number(vk);
    const sum = (measure.voices[v] ?? []).reduce((s, e) => s + e.duration, 0);
    byVoice.set(v, sum);
  }
  return byVoice;
}

function trimOverflowFromVoiceEnd(events: NoteEvent[], overflow: number): void {
  let over = overflow;
  for (let i = events.length - 1; i >= 0 && over > EPS; i--) {
    const e = events[i];
    const cut = Math.min(e.duration, over);
    e.duration -= cut;
    over -= cut;
    if (e.duration <= EPS) events.splice(i, 1);
  }
}

/**
 * Ensures each voice in the measure sums to exactly MEASURE_DIVISIONS.
 * - Underflow: append rest (`pitch === 0`) for the gap.
 * - Overflow: shorten/remove from the end of that voice only (duration accounting only).
 */
export function finalizeWybleMeasureBarMathPerVoice(m: Measure): void {
  const voiceIds = [...new Set(Object.keys(m.voices).map(Number))].sort((a, b) => a - b);
  for (const voice of voiceIds) {
    const events = m.voices[voice] ?? [];
    if (events.length === 0) {
      m.voices[voice] = [{ pitch: 0, duration: MEASURE_DIVISIONS, voice }];
      continue;
    }

    let sum = events.reduce((s, e) => s + e.duration, 0);

    if (sum > MEASURE_DIVISIONS + EPS) {
      trimOverflowFromVoiceEnd(events, sum - MEASURE_DIVISIONS);
      sum = events.reduce((s, e) => s + e.duration, 0);
    }

    if (events.length === 0 || sum < EPS) {
      m.voices[voice] = [{ pitch: 0, duration: MEASURE_DIVISIONS, voice }];
      continue;
    }

    if (sum < MEASURE_DIVISIONS - EPS) {
      events.push({
        pitch: 0,
        duration: MEASURE_DIVISIONS - sum,
        voice,
      });
    }
  }
}
