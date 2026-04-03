/**
 * 32-bar Duo long-form map: A / A' / B / A'' (V4.0 Prompt 1/8).
 */

import type { SectionRole } from '../section-roles/sectionRoleTypes';

export interface DuoLongFormSectionSpec {
  label: string;
  startBar: number;
  length: number;
  role: SectionRole;
}

export interface DuoLongFormPlan {
  totalBars: 16 | 32;
  sections: DuoLongFormSectionSpec[];
}

/**
 * Fixed 32-bar architecture — does not replace the 8-bar planner; used only when long-form route is selected.
 */
export function buildDuoLongFormPlan(): DuoLongFormPlan {
  return {
    totalBars: 32,
    sections: [
      { label: 'A', startBar: 1, length: 8, role: 'statement' },
      { label: "A'", startBar: 9, length: 8, role: 'development' },
      { label: 'B', startBar: 17, length: 8, role: 'contrast' },
      { label: "A''", startBar: 25, length: 8, role: 'return' },
    ],
  };
}

/** Two 8-bar sections — used when `totalBars === 16`. */
export function buildDuoLongFormPlan16(): DuoLongFormPlan {
  return {
    totalBars: 16,
    sections: [
      { label: 'A', startBar: 1, length: 8, role: 'statement' },
      { label: 'B', startBar: 9, length: 8, role: 'contrast' },
    ],
  };
}
