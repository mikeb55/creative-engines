/**
 * Composer OS V2 — Section role validation
 */

import type { SectionWithRole } from './sectionRoleTypes';

export interface SectionRoleValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSectionRoles(sections: SectionWithRole[]): SectionRoleValidationResult {
  const errors: string[] = [];
  if (sections.length === 0) errors.push('At least one section required');
  return { valid: errors.length === 0, errors };
}
