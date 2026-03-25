/**
 * Validate lead melody plan shape (Song Mode planning layer).
 */

import type { LeadMelodyPlan } from './leadMelodyTypes';

export function validateLeadMelodyPlan(plan: LeadMelodyPlan | undefined): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!plan) {
    errors.push('Lead melody: plan missing');
    return { ok: false, errors };
  }
  if (!plan.phrases.length) errors.push('Lead melody: no phrases');
  if (!plan.notes.length) errors.push('Lead melody: empty note list');
  if (!plan.cadenceMeasures.length) errors.push('Lead melody: no cadence markers');
  return { ok: errors.length === 0, errors };
}

/** When pop plans expect hook return in chorus, the melody plan must mark the chorus entry bar. */
export function validateHookReturnConsistency(
  plan: LeadMelodyPlan,
  expectsHookReturnInChorus: boolean
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (expectsHookReturnInChorus && plan.hookReturnMeasure == null) {
    errors.push('Lead melody: hook return expected in chorus but hookReturnMeasure missing');
  }
  return { ok: errors.length === 0, errors };
}
