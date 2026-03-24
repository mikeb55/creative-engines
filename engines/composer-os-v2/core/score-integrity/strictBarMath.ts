/**
 * Strict bar-math validation on the score model (pre-export).
 * Per-voice: event durations must sum to the time signature and not overlap.
 */

import type { ScoreModel, ScoreEvent } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';

export interface StrictBarMathResult {
  valid: boolean;
  errors: string[];
}

const EPS = 1e-4;

export function validateStrictBarMath(score: ScoreModel): StrictBarMathResult {
  const errors: string[] = [];

  for (const part of score.parts) {
    for (const m of part.measures) {
      const byVoice = new Map<number, ScoreEvent[]>();
      for (const e of m.events) {
        const v = e.voice ?? 1;
        if (!byVoice.has(v)) byVoice.set(v, []);
        byVoice.get(v)!.push(e);
      }

      if (byVoice.size === 0) {
        errors.push(`Part ${part.id} measure ${m.index}: empty (no events)`);
        continue;
      }

      for (const [voice, events] of byVoice) {
        const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
        let durSum = 0;
        for (const e of sorted) durSum += e.duration;
        if (Math.abs(durSum - BEATS_PER_MEASURE) > EPS) {
          errors.push(
            `Part ${part.id} measure ${m.index} voice ${voice}: duration sum ${durSum} ≠ ${BEATS_PER_MEASURE}`
          );
        }

        let cursor = 0;
        for (const e of sorted) {
          if (e.startBeat + EPS < cursor) {
            errors.push(
              `Part ${part.id} measure ${m.index} voice ${voice}: overlapping events at beat ${e.startBeat}`
            );
            break;
          }
          cursor = Math.max(cursor, e.startBeat + e.duration);
        }
        if (cursor - BEATS_PER_MEASURE > EPS) {
          errors.push(
            `Part ${part.id} measure ${m.index} voice ${voice}: content extends past bar (${cursor} > ${BEATS_PER_MEASURE})`
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
