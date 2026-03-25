/**
 * Density + humanisation — metadata only (no pitch rewrites).
 */

export type DensityBiasLevel = 'sparse' | 'medium' | 'dense';

export interface DensityControlState {
  bias: DensityBiasLevel;
}

export interface HumanisationMetadata {
  enabled: boolean;
  /** 0–1 scalars for downstream articulation / feel hints */
  articulationBias: number;
  rhythmicLooseness: number;
  sustainAttackBias: number;
}
