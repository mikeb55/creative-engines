/**
 * Composer OS V2 — Density curve planner
 */

import type { DensityCurvePlan, DensitySegment, DensityLevel } from './densityCurveTypes';
import type { SectionWithRole } from '../section-roles/sectionRoleTypes';

function roleToDensity(role: SectionWithRole): DensityLevel {
  const t = role.metadata.densityTendency;
  if (t === 'sparse') return 'sparse';
  if (t === 'dense') return 'dense';
  return 'medium';
}

export function planDensityCurve(sections: SectionWithRole[], totalBars: number): DensityCurvePlan {
  const segments: DensitySegment[] = sections.map((s) => ({
    startBar: s.startBar,
    length: s.length,
    level: roleToDensity(s),
  }));
  return { segments, totalBars };
}

export function getDensityForBar(plan: DensityCurvePlan, bar: number): DensityLevel {
  for (const seg of plan.segments) {
    if (bar >= seg.startBar && bar < seg.startBar + seg.length) return seg.level;
  }
  return 'medium';
}
