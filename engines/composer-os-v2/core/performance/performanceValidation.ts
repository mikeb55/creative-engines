/**
 * Composer OS V2 — Performance pass validation
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';

export interface PerformanceValidationResult {
  valid: boolean;
  errors: string[];
}

function extractPitches(score: ScoreModel): Map<string, number[]> {
  const byPart = new Map<string, number[]>();
  for (const p of score.parts) {
    const pitches: number[] = [];
    for (const m of p.measures) {
      for (const e of m.events) {
        if (e.kind === 'note') pitches.push(e.pitch);
      }
    }
    byPart.set(p.instrumentIdentity, pitches);
  }
  return byPart;
}

/** Verify no pitch drift between before and after performance pass. */
export function validatePerformanceIntegrity(
  beforeScore: ScoreModel,
  afterScore: ScoreModel
): PerformanceValidationResult {
  const errors: string[] = [];
  const before = extractPitches(beforeScore);
  const after = extractPitches(afterScore);

  for (const [partId, beforePitches] of before) {
    const afterPitches = after.get(partId) ?? [];
    if (beforePitches.length !== afterPitches.length) {
      errors.push(`Performance integrity: event count changed for ${partId}`);
    }
    for (let i = 0; i < Math.min(beforePitches.length, afterPitches.length); i++) {
      if (beforePitches[i] !== afterPitches[i]) {
        errors.push(`Performance integrity: pitch drift in ${partId} at index ${i}`);
      }
    }
  }

  const beforeTotal = beforeScore.parts.reduce((s, p) => s + p.measures.reduce((sm, m) => sm + m.events.reduce((se, e) => se + (e.kind === 'note' ? 1 : 0), 0), 0), 0);
  const afterTotal = afterScore.parts.reduce((s, p) => s + p.measures.reduce((sm, m) => sm + m.events.reduce((se, e) => se + (e.kind === 'note' ? 1 : 0), 0), 0), 0);
  if (beforeTotal !== afterTotal) {
    errors.push('Performance integrity: note count changed');
  }

  for (const p of afterScore.parts) {
    for (const m of p.measures) {
      let totalDuration = 0;
      for (const e of m.events) {
        totalDuration += e.duration;
      }
      if (Math.abs(totalDuration - 4) > 0.01) {
        errors.push(`Performance integrity: bar math broken in ${p.id} measure ${m.index}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
