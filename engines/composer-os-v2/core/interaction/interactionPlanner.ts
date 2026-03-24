/**
 * Composer OS V2 — Interaction planner
 */

import type { SectionWithRole } from '../section-roles/sectionRoleTypes';
import type { InteractionPlan, InteractionMode, SectionInteractionPlan } from './interactionTypes';

const DEFAULT_REGISTER_SEPARATION = 8;

/** Golden path default: A support, B light call_response. */
export function planInteraction(
  sections: SectionWithRole[],
  totalBars: number,
  overrides?: Partial<{ registerSeparationThreshold: number }>
): InteractionPlan {
  const perSection = sections.map((s) => {
    const isA = s.label === 'A';
    const mode: InteractionMode = isA ? 'support' : 'light_call_response' as InteractionMode;
    const resolvedMode = mode === ('light_call_response' as InteractionMode) ? 'call_response' : mode;
    return {
      sectionLabel: s.label,
      startBar: s.startBar,
      length: s.length,
      mode: resolvedMode,
      coupling: isA ? undefined : { guitarReduceAttack: true },
    };
  });
  return {
    perSection,
    totalBars,
    registerSeparationThreshold: overrides?.registerSeparationThreshold ?? DEFAULT_REGISTER_SEPARATION,
  };
}

export function getInteractionForBar(plan: InteractionPlan, bar: number): SectionInteractionPlan | undefined {
  return plan.perSection.find((s) => bar >= s.startBar && bar < s.startBar + s.length);
}
