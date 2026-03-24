/**
 * Composer OS V2 — Score model validation
 */

import type { ScoreModel, PartModel, MeasureModel, ScoreEvent } from './scoreModelTypes';
import { BEATS_PER_MEASURE } from './scoreModelTypes';

export interface ScoreModelValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate measure duration sums to BEATS_PER_MEASURE. */
function measureDuration(measure: MeasureModel): number {
  return measure.events.reduce((sum, e) => sum + e.duration, 0);
}

/** Validate score model structure. */
export function validateScoreModel(score: ScoreModel): ScoreModelValidationResult {
  const errors: string[] = [];

  if (!score.title?.trim()) errors.push('Score title required');
  if (!score.parts?.length) errors.push('At least one part required');

  for (const part of score.parts) {
    if (!part.id?.trim()) errors.push(`Part missing id`);
    if (!part.measures?.length) errors.push(`Part ${part.id}: no measures`);

    for (const m of part.measures) {
      const dur = measureDuration(m);
      if (Math.abs(dur - BEATS_PER_MEASURE) > 0.01) {
        errors.push(`Part ${part.id} measure ${m.index}: duration ${dur} != ${BEATS_PER_MEASURE}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
