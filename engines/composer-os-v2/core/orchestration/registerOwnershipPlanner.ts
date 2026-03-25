/**
 * Register ownership — declarative band assignment per section (Prompt 4/7).
 */

import type { OrchestrationSectionSlice, RegisterBand } from './orchestrationTypes';

export interface RegisterOwnershipEntry {
  partId: string;
  sectionIndex: number;
  registerBand: RegisterBand;
  /** When true, part claims melodic priority in this register (crowding checks). */
  claimsMelodicPriority: boolean;
}

export interface RegisterOwnershipPlan {
  entries: RegisterOwnershipEntry[];
  /** Max simultaneous parts allowed in `middle` with melodic priority (anti-crowding). */
  maxMidRegisterLeadParts: number;
}

export interface RegisterOwnershipPlannerInput {
  sections: OrchestrationSectionSlice[];
  /** partId -> default register bias */
  partRegisterBias: Record<string, RegisterBand>;
  /** partId -> true if this part may take lead in mid register */
  mayLeadInMidRegister: Record<string, boolean>;
}

/**
 * Assigns register bands per part per section; caps mid-register melodic leaders.
 */
export function planRegisterOwnership(input: RegisterOwnershipPlannerInput): RegisterOwnershipPlan {
  const entries: RegisterOwnershipEntry[] = [];
  for (const sec of input.sections) {
    for (const partId of Object.keys(input.partRegisterBias)) {
      const base = input.partRegisterBias[partId];
      let band = base;
      if (base === 'middle' && !input.mayLeadInMidRegister[partId]) {
        band = 'low';
      }
      entries.push({
        partId,
        sectionIndex: sec.index,
        registerBand: band,
        claimsMelodicPriority: input.mayLeadInMidRegister[partId] === true && band === 'middle',
      });
    }
  }
  return { entries, maxMidRegisterLeadParts: 1 };
}
