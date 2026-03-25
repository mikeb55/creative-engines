/**
 * Map density bias → optional styleOverrides / feel hints (additive only).
 */

import type { DensityBiasLevel, DensityControlState } from './densityControlTypes';

export interface DensityFeelHint {
  densityBias: DensityBiasLevel;
  /** Suggested weight for density curve emphasis (informational). */
  curveWeight: number;
}

export function densityControlToFeelHint(state: DensityControlState): DensityFeelHint {
  const w = state.bias === 'sparse' ? 0.35 : state.bias === 'dense' ? 0.85 : 0.55;
  return { densityBias: state.bias, curveWeight: w };
}
