/**
 * Interaction arc for 32–64-bar Duo — deliberate role shifts per section.
 */

import type { SectionRole, SectionWithRole } from '../section-roles/sectionRoleTypes';
import type { InteractionCoupling, InteractionPlan, InteractionMode, SectionInteractionPlan } from './interactionTypes';

const DEFAULT_REGISTER_SEPARATION = 8;

function interactionForSectionRole(role: SectionRole): { mode: InteractionMode; coupling: InteractionCoupling } {
  switch (role) {
    case 'statement':
      return { mode: 'support', coupling: { bassDeferToGuitar: true } };
    case 'development':
      return {
        mode: 'call_response',
        coupling: { bassDeferToGuitar: false, bassForward: true, guitarReduceAttack: false },
      };
    case 'contrast':
      return {
        mode: 'call_response',
        coupling: { bassForward: true, guitarReduceAttack: true, bassSimplify: false },
      };
    case 'return':
      return {
        mode: 'call_response',
        coupling: { bassDeferToGuitar: false, bassForward: true, guitarReduceAttack: false },
      };
    default:
      return { mode: 'support', coupling: { bassDeferToGuitar: true } };
  }
}

/**
 * A: guitar-led support — A': stronger bass replies — B: bass-led challenge — A'': integrated dialogue + return.
 * Section roles are derived from the long-form plan (including 40–64 bar cycles).
 */
export function planDuoLongFormInteraction(
  sections: SectionWithRole[],
  totalBars: number
): InteractionPlan {
  const perSection: SectionInteractionPlan[] = sections.map((s) => {
    const { mode, coupling } = interactionForSectionRole(s.role);
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
