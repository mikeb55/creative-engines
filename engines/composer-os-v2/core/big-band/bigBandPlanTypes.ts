/**
 * Big Band — declarative plans only (Prompt 5/7).
 */

import type { BigBandInstrumentSection } from './bigBandSectionTypes';
import type { BigBandRoleType } from './bigBandTypes';
import type { DensityBand } from '../orchestration/orchestrationTypes';

/** Formal chart phases (ordering is meaningful). */
export type BigBandFormPhase =
  | 'intro'
  | 'melody_head'
  | 'background_figures'
  | 'solo_section'
  | 'shout_chorus'
  | 'ending';

export interface BigBandFormSlice {
  index: number;
  phase: BigBandFormPhase;
  startBar: number;
  endBar: number;
}

export interface BigBandFormPlan {
  totalBars: number;
  slices: BigBandFormSlice[];
}

/** Per form slice: role assignment for each instrument section. */
export interface BigBandSectionSlicePlan {
  formSliceIndex: number;
  phase: BigBandFormPhase;
  rolesBySection: Record<BigBandInstrumentSection, BigBandRoleType>;
}

export interface BigBandSectionPlan {
  slices: BigBandSectionSlicePlan[];
}

export interface BigBandDensitySlice {
  formSliceIndex: number;
  phase: BigBandFormPhase;
  density: DensityBand;
}

export interface BigBandDensityPlan {
  slices: BigBandDensitySlice[];
}

export interface BigBandPlanningBundle {
  formPlan: BigBandFormPlan;
  sectionPlan: BigBandSectionPlan;
  densityPlan: BigBandDensityPlan;
}
