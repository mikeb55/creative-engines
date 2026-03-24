/**
 * Composer OS V2 — Rehearsal mark validation
 * Rehearsal mark completeness.
 */

import type { RehearsalMarkForValidation } from './scoreIntegrityTypes';

export interface RehearsalMarkValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate rehearsal marks when required. */
export function validateRehearsalMarks(
  marks: RehearsalMarkForValidation[],
  required: boolean = false
): RehearsalMarkValidationResult {
  const errors: string[] = [];

  if (required && marks.length === 0) {
    errors.push('Rehearsal marks required but none provided');
  }

  for (const m of marks) {
    if (!m.label || m.label.trim() === '') {
      errors.push(`Empty rehearsal mark at bar ${m.bar}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
