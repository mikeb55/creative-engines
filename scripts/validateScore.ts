import type { Score } from '../engines/core/timing';
import { MEASURE_DIVISIONS } from '../engines/core/timing';

export function validateScore(score: Score): void {
  for (const m of score.measures) {
    for (const v of Object.keys(m.voices)) {
      const total = m.voices[Number(v)]
        .map((n) => n.duration)
        .reduce((a, b) => a + b, 0);

      if (total !== MEASURE_DIVISIONS) {
        throw new Error(
          `Measure ${m.index} voice ${v} invalid duration ${total}`
        );
      }
    }
  }
}
