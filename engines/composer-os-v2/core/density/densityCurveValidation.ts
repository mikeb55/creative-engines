/**
 * Composer OS V2 — Density curve validation
 */

import type { DensityCurvePlan } from './densityCurveTypes';
import type { SectionWithRole } from '../section-roles/sectionRoleTypes';

export interface DensityValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDensityCurve(
  plan: DensityCurvePlan,
  sections: SectionWithRole[]
): DensityValidationResult {
  const errors: string[] = [];
  const covered = plan.segments.reduce((sum, s) => sum + s.length, 0);
  if (covered !== plan.totalBars) errors.push(`Density curve covers ${covered} bars, expected ${plan.totalBars}`);
  if (plan.segments.length !== sections.length) errors.push('Density segments must match sections');
  return { valid: errors.length === 0, errors };
}
