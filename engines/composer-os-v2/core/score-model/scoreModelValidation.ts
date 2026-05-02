/**
 * Composer OS V2 — Score model validation
 */

import type { ScoreModel, MeasureModel } from './scoreModelTypes';
import { measureBeatSpanQuartersOf } from './measureBeatSpan';

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

/** Per-voice duration sums (multi-voice parts: each voice fills the measure span; summing all events would double-count). */
function measureDurationByVoice(measure: MeasureModel): Map<number, number> {
  const byVoice = new Map<number, number>();
  for (const e of measure.events) {
    const v = e.voice ?? 1;
    byVoice.set(v, (byVoice.get(v) ?? 0) + e.duration);
  }
  return byVoice;
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
      const byVoice = measureDurationByVoice(m);
      const barCap = measureBeatSpanQuartersOf(m);
      if (byVoice.size === 0) {
        errors.push(`Part ${part.id} measure ${m.index}: duration 0 != ${barCap}`);
        continue;
      }
      for (const [voice, dur] of [...byVoice.entries()].sort((a, b) => a[0] - b[0])) {
        if (Math.abs(dur - barCap) > 0.01) {
          errors.push(`Part ${part.id} measure ${m.index} voice ${voice}: duration ${dur} != ${barCap}`);
        }
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
