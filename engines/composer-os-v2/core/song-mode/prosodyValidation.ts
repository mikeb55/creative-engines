/**
 * Validate prosody placeholder plan (Song Mode).
 */

import type { ProsodyPlaceholderPlan } from './lyricProsodyTypes';

export function validateProsodyPlaceholderPlan(plan: ProsodyPlaceholderPlan | undefined): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!plan) {
    errors.push('Prosody: plan missing');
    return { ok: false, errors };
  }
  if (!plan.lines.length) errors.push('Prosody: no lines');
  for (const line of plan.lines) {
    if (!line.stressPattern.length) errors.push(`Prosody: empty stress pattern for ${line.phraseId}`);
    if (line.syllableSlots.some((s) => s < 1)) errors.push(`Prosody: invalid syllable slot for ${line.phraseId}`);
  }
  if (plan.melodicStressAlignmentScore < 0 || plan.melodicStressAlignmentScore > 1) {
    errors.push('Prosody: alignment score out of range');
  }
  return { ok: errors.length === 0, errors };
}
