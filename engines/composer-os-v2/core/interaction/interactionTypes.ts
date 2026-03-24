/**
 * Composer OS V2 — Interaction types
 */

export type InteractionMode = 'call_response' | 'overlap' | 'support' | 'independent';

export interface InteractionCoupling {
  bassSimplify?: boolean;
  guitarReduceAttack?: boolean;
}

export interface SectionInteractionPlan {
  sectionLabel: string;
  startBar: number;
  length: number;
  mode: InteractionMode;
  coupling?: InteractionCoupling;
}

export interface InteractionPlan {
  perSection: SectionInteractionPlan[];
  totalBars: number;
  /** Min semitones between bass ceiling and guitar floor (vertical spacing). */
  registerSeparationThreshold: number;
}
