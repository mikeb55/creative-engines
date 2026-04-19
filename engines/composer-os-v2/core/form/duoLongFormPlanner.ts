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
  totalBars: number;
  sections: DuoLongFormSectionSpec[];
}

const ROLE_CYCLE: SectionRole[] = ['statement', 'development', 'contrast', 'return'];
const LABEL_CYCLE = ['A', "A'", 'B', "A''"] as const;

/**
 * 8-bar chunks up to 64 bars — cycle A / A′ / B / A″ with numeric suffix when the cycle repeats (second pass).
 */
export function buildDuoLongFormPlanForBarCount(n: number): DuoLongFormPlan {
  if (n === 16) return buildDuoLongFormPlan16();
  if (n === 32) return buildDuoLongFormPlan();
  if (n % 8 !== 0 || n < 8 || n > 64) {
    throw new Error(`buildDuoLongFormPlanForBarCount: expected 8–64 bars in steps of 8, got ${n}`);
  }
  const numSections = n / 8;
  const sections: DuoLongFormSectionSpec[] = [];
  for (let i = 0; i < numSections; i++) {
    const base = LABEL_CYCLE[i % 4]!;
    const cycle = Math.floor(i / 4);
    const label = cycle === 0 ? base : `${base}-${cycle + 1}`;
    sections.push({
      label,
      startBar: 1 + i * 8,
      length: 8,
      role: ROLE_CYCLE[i % 4]!,
    });
  }
  return { totalBars: n, sections };
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
