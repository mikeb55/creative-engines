/**
 * Validates modulation plans — legal keys, coherent journey, B contrast.
 */

import type { ModulationPlan } from './modulationPlanTypes';

export function validateModulationPlan(plan: ModulationPlan): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!plan.active) {
    return { valid: true, errors: [] };
  }
  if (!plan.baseKey || plan.baseKey.length < 2) {
    errors.push('Modulation: baseKey missing');
  }
  const secs = plan.sections;
  if (secs.length !== 4) {
    errors.push(`Modulation: expected 4 sections, got ${secs.length}`);
  }
  for (const s of secs) {
    if (Math.abs(s.semitoneOffset) > 12) {
      errors.push(`Modulation: semitoneOffset ${s.semitoneOffset} out of range for ${s.sectionId}`);
    }
  }
  const b = secs.find((x) => x.sectionId === 'B');
  const a = secs.find((x) => x.sectionId === 'A');
  if (b && a && a.semitoneOffset === b.semitoneOffset) {
    errors.push('Modulation: B section must contrast with A when plan is active');
  }
  const last = secs.find((x) => x.sectionId === "A''");
  if (last && last.semitoneOffset !== 0) {
    errors.push("Modulation: A'' must return home (semitoneOffset 0)");
  }
  return { valid: errors.length === 0, errors };
}
