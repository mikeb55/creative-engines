/**
 * Texture ownership — who carries foreground vs pad vs counterline (Prompt 4/7).
 */

import type { OrchestrationRoleLabel } from './orchestrationRoleTypes';
import type { OrchestrationSectionSlice } from './orchestrationTypes';

export interface TextureOwnershipEntry {
  sectionIndex: number;
  partId: string;
  textureRole: OrchestrationRoleLabel;
}

export interface TextureOwnershipPlan {
  entries: TextureOwnershipEntry[];
  /** At most one explicit lead per section when enforceSingleLead is true. */
  enforceSingleLead: boolean;
}

export interface TextureOwnershipPlannerInput {
  sections: OrchestrationSectionSlice[];
  /** Primary melodic part per section (lead). */
  leadPartBySection: Record<number, string>;
  /** Optional explicit texture map; merged with lead. */
  textureByPartAndSection?: Array<{ partId: string; sectionIndex: number; textureRole: OrchestrationRoleLabel }>;
}

export function planTextureOwnership(input: TextureOwnershipPlannerInput): TextureOwnershipPlan {
  const entries: TextureOwnershipEntry[] = [];
  const bySec = new Map<number, Map<string, OrchestrationRoleLabel>>();

  for (const sec of input.sections) {
    const lead = input.leadPartBySection[sec.index];
    const m = new Map<string, OrchestrationRoleLabel>();
    if (lead) m.set(lead, 'lead');
    bySec.set(sec.index, m);
  }

  if (input.textureByPartAndSection) {
    for (const row of input.textureByPartAndSection) {
      const m = bySec.get(row.sectionIndex);
      if (m) m.set(row.partId, row.textureRole);
    }
  }

  for (const [sectionIndex, pmap] of bySec) {
    for (const [partId, textureRole] of pmap) {
      entries.push({ sectionIndex, partId, textureRole });
    }
  }

  return { entries, enforceSingleLead: true };
}
