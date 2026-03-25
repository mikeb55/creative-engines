/**
 * String quartet — declarative plans (Prompt 6/7).
 */

import type { QuartetInstrument } from './stringQuartetTypes';
import type { QuartetRoleType } from './quartetRoleTypes';
import type { DensityBand } from '../orchestration/orchestrationTypes';

export type QuartetFormPhase = 'statement' | 'development' | 'contrast' | 'return' | 'coda';

export interface QuartetFormSlice {
  index: number;
  phase: QuartetFormPhase;
  startBar: number;
  endBar: number;
}

export interface QuartetFormPlan {
  totalBars: number;
  slices: QuartetFormSlice[];
}

export interface QuartetTextureSlicePlan {
  formSliceIndex: number;
  phase: QuartetFormPhase;
  rolesByInstrument: Record<QuartetInstrument, QuartetRoleType>;
}

export interface QuartetTexturePlan {
  slices: QuartetTextureSlicePlan[];
}

export interface QuartetDensitySlice {
  formSliceIndex: number;
  phase: QuartetFormPhase;
  density: DensityBand;
}

export interface QuartetDensityPlan {
  slices: QuartetDensitySlice[];
}
