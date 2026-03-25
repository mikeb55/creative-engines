/**
 * Density ownership — responsibility per section to avoid overload (Prompt 4/7).
 */

import type { DensityBand, OrchestrationSectionSlice } from './orchestrationTypes';

export interface DensityOwnershipEntry {
  sectionIndex: number;
  partId: string;
  densityBand: DensityBand;
  /** Relative weight for overload sum (0–1). */
  weight: number;
}

export interface DensityOwnershipPlan {
  entries: DensityOwnershipEntry[];
  /** Sum of weights per section must not exceed this threshold. */
  overloadThreshold: number;
}

export interface DensityOwnershipPlannerInput {
  sections: OrchestrationSectionSlice[];
  /** Default density weight curve per section index. */
  sectionDensityBias: Record<number, DensityBand>;
  /** partId -> base weight */
  partWeights: Record<string, number>;
}

const bandToWeight: Record<DensityBand, number> = {
  sparse: 0.25,
  moderate: 0.45,
  dense: 0.75,
};

export function planDensityOwnership(input: DensityOwnershipPlannerInput): DensityOwnershipPlan {
  const entries: DensityOwnershipEntry[] = [];
  for (const sec of input.sections) {
    const bias = input.sectionDensityBias[sec.index] ?? 'moderate';
    for (const partId of Object.keys(input.partWeights)) {
      const w = input.partWeights[partId] * bandToWeight[bias];
      entries.push({
        sectionIndex: sec.index,
        partId,
        densityBand: bias,
        weight: w,
      });
    }
  }
  return { entries, overloadThreshold: 1.35 };
}
