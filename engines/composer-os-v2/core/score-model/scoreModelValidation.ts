/**
 * Composer OS V2 — Score model validation
 */

import type { ScoreModel, MeasureModel } from './scoreModelTypes';
import { BEATS_PER_MEASURE } from './scoreModelTypes';

export interface ScoreModelValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidateScoreModelOptions {
  /** Reject measures with more than this many events (sanity / explosion guard). Default 256. */
  maxEventsPerMeasure?: number;
  /** When true, fail if no note events exist anywhere in the score. */
  requireAtLeastOneNote?: boolean;
}

/** Validate measure duration sums to BEATS_PER_MEASURE. */
function measureDuration(measure: MeasureModel): number {
  return measure.events.reduce((sum, e) => sum + e.duration, 0);
}

/** Validate score model structure. */
export function validateScoreModel(score: ScoreModel, options?: ValidateScoreModelOptions): ScoreModelValidationResult {
  const errors: string[] = [];
  const maxEv = options?.maxEventsPerMeasure ?? 256;
  const requireNote = options?.requireAtLeastOneNote ?? false;

  if (!score.title?.trim()) errors.push('Score title required');
  if (!score.parts?.length) errors.push('At least one part required');

  let noteCount = 0;

  for (const part of score.parts) {
    if (!part.id?.trim()) errors.push(`Part missing id`);
    if (!part.measures?.length) errors.push(`Part ${part.id}: no measures`);

    for (const m of part.measures) {
      if (m.events.length > maxEv) {
        errors.push(`Part ${part.id} measure ${m.index}: too many events (${m.events.length} > ${maxEv})`);
      }
      const dur = measureDuration(m);
      if (Math.abs(dur - BEATS_PER_MEASURE) > 0.01) {
        errors.push(`Part ${part.id} measure ${m.index}: duration ${dur} != ${BEATS_PER_MEASURE}`);
      }
      for (const e of m.events) {
        if (e.kind === 'note') noteCount++;
      }
    }
  }

  if (requireNote && noteCount === 0) {
    errors.push('Score has no notes (empty piece).');
  }

  return { valid: errors.length === 0, errors };
}
