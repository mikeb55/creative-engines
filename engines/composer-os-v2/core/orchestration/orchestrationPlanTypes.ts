/**
 * Orchestration plan shapes — declarative planning only (Prompt 4/7).
 */

import type { EnsembleFamily } from './ensembleFamilyTypes';
import type { OrchestrationSectionSlice, PartOrchestrationRow, SilenceEligibility } from './orchestrationTypes';
import type { DensityOwnershipPlan } from './densityOwnershipPlanner';
import type { RegisterOwnershipPlan } from './registerOwnershipPlanner';
import type { TextureOwnershipPlan } from './textureOwnershipPlanner';

export type { OrchestrationSectionSlice } from './orchestrationTypes';

/**
 * Role assignment grid: outer index = section slice, inner = parts active in that slice.
 */
export type SectionRoleMatrix = Array<{
  section: OrchestrationSectionSlice;
  rows: PartOrchestrationRow[];
}>;

export interface OrchestrationPlan {
  ensembleFamily: EnsembleFamily;
  /** Optional preset id for compatibility checks (e.g. guitar_bass_duo). */
  presetId?: string;
  totalBars: number;
  sections: OrchestrationSectionSlice[];
  /** Per-section part rows (role + register + density hints). */
  sectionRoleMatrix: SectionRoleMatrix;
  registerOwnership: RegisterOwnershipPlan;
  textureOwnership: TextureOwnershipPlan;
  densityOwnership: DensityOwnershipPlan;
  /** Bars where explicit silence is a valid assignment for eligible parts. */
  silenceEligibleByBar: boolean[];
  silenceEligibility: SilenceEligibility[];
}

/** Narrow view for manifests / handoff (no planner internals). */
export interface OrchestrationPlanSummary {
  ensembleFamily: EnsembleFamily;
  presetId?: string;
  totalBars: number;
  sectionLabels: string[];
  partIds: string[];
  primaryLeadPartId?: string;
  bassAnchorPartId?: string;
}
