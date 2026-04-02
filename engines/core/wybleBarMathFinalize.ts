/**
 * Jimmy Wyble legacy Score (`engines/core/timing`): exact 4/4 per voice per measure in divisions.
 * Mirrors the contract of `duoBarMathFinalize.rebuildMonophonicVoiceLine` / `measureDurationByVoice`:
 * each voice is an independent timeline summing to MEASURE_DIVISIONS (no cross-voice summing).
 */

import type { Measure, NoteEvent } from './timing';
import { MEASURE_DIVISIONS } from './timing';

const EPS = 1e-6;

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
