/**
 * Shared orchestration primitives — register, density, articulation (Prompt 4/7).
 */

import type { OrchestrationRoleLabel } from './orchestrationRoleTypes';

/** Tessitura bucket for ownership and crowding checks. */
export type RegisterBand = 'sub_bass' | 'bass' | 'low' | 'middle' | 'high' | 'very_high';

/** Activity / note-density responsibility (orthogonal to register band). */
export type DensityBand = 'sparse' | 'moderate' | 'dense';

/** Planning bias for future performance pass — not performance data. */
export type ArticulationBias = 'legato' | 'staccato' | 'mixed' | 'neutral';

/** Sustain vs attack envelope hint for orchestration planning. */
export type SustainVsAttack = 'sustain_heavy' | 'attack_heavy' | 'balanced';

/** One formal section span (for planning; bars are 1-based inclusive). */
export interface OrchestrationSectionSlice {
  index: number;
  label?: string;
  startBar: number;
  endBar: number;
}

/** Whether a part may be assigned explicit silence in a slice. */
export interface SilenceEligibility {
  partId: string;
  eligible: boolean;
  reason?: string;
}

/** One part’s orchestration row for a time slice (section or bar span). */
export interface PartOrchestrationRow {
  partId: string;
  instrumentRole: OrchestrationRoleLabel;
  textureRole: OrchestrationRoleLabel;
  registerBand: RegisterBand;
  densityBand: DensityBand;
  articulationBias: ArticulationBias;
  sustainVsAttack: SustainVsAttack;
}
