/**
 * Composer OS V2 — Bar math validation
 * Measure duration correctness.
 */

import type { BarForValidation } from './scoreIntegrityTypes';

const EXPECTED_BEATS = 4;

export interface BarMathResult {
  valid: boolean;
  errors: string[];
}

/** Validate bar durations sum correctly. */
export function validateBarMath(
  bars: BarForValidation[],
  expectedBeatsPerBar: number = EXPECTED_BEATS
): BarMathResult {
  const errors: string[] = [];

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (bar.duration !== expectedBeatsPerBar) {
      errors.push(`Bar ${bar.index + 1}: expected ${expectedBeatsPerBar} beats, got ${bar.duration}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
