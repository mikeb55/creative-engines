/**
 * Composer OS V2 — Section role planner
 */

import type { SectionWithRole, SectionRole, SectionRoleMetadata } from './sectionRoleTypes';

const ROLE_METADATA: Record<SectionRole, SectionRoleMetadata> = {
  statement: { role: 'statement', densityTendency: 'sparse', registerTendency: 'centre', rhythmActivity: 'low', textureTendency: 'melodic' },
  development: { role: 'development', densityTendency: 'medium', registerTendency: 'centre', rhythmActivity: 'medium', textureTendency: 'mixed' },
  contrast: { role: 'contrast', densityTendency: 'medium', registerTendency: 'lift', rhythmActivity: 'medium', textureTendency: 'mixed' },
  return: { role: 'return', densityTendency: 'sparse', registerTendency: 'centre', rhythmActivity: 'low', textureTendency: 'melodic' },
};

export function planSectionRoles(
  sections: Array<{ label: string; startBar: number; length: number }>,
  roleMap: Record<string, SectionRole>
): SectionWithRole[] {
  return sections.map((s) => ({
    ...s,
    role: roleMap[s.label] ?? 'statement',
    metadata: ROLE_METADATA[roleMap[s.label] ?? 'statement'],
  }));
}
