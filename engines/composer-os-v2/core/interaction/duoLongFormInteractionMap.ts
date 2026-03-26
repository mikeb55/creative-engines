/**
 * Interaction arc for 32-bar Duo — deliberate role shifts per section.
 */

import type { SectionWithRole } from '../section-roles/sectionRoleTypes';
import type { InteractionCoupling, InteractionPlan, InteractionMode, SectionInteractionPlan } from './interactionTypes';

const DEFAULT_REGISTER_SEPARATION = 8;

/**
 * A: guitar-led support — A': stronger bass replies — B: bass-led challenge — A'': integrated dialogue + return.
 */
export function planDuoLongFormInteraction(
  sections: SectionWithRole[],
  totalBars: number
): InteractionPlan {
  const perSection: SectionInteractionPlan[] = sections.map((s) => {
    let mode: InteractionMode = 'support';
    let coupling: InteractionCoupling = { bassDeferToGuitar: true };

    if (s.label === 'A') {
      mode = 'support';
      coupling = { bassDeferToGuitar: true };
    } else if (s.label === "A'") {
      mode = 'call_response';
      coupling = { bassDeferToGuitar: false, bassForward: true, guitarReduceAttack: false };
    } else if (s.label === 'B') {
      mode = 'call_response';
      coupling = { bassForward: true, guitarReduceAttack: true, bassSimplify: false };
    } else if (s.label === "A''") {
      mode = 'call_response';
      coupling = { bassDeferToGuitar: false, bassForward: true, guitarReduceAttack: false };
    }

    return {
      sectionLabel: s.label,
      startBar: s.startBar,
      length: s.length,
      mode,
      coupling,
    };
  });

  return {
    perSection,
    totalBars,
    registerSeparationThreshold: DEFAULT_REGISTER_SEPARATION,
  };
}
