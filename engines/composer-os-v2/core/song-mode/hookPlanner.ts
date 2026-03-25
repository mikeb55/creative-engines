/**
 * Hook planning metadata (no final notes or lyrics).
 */

import type { SongSectionPlan } from './songModeTypes';
import type { SongwriterRuleId } from './songwritingResearchTypes';

export type HookTypeKind = 'melodic' | 'rhythmic' | 'harmonic' | 'lyrical_placeholder';

export interface HookPlan {
  primaryHookType: HookTypeKind;
  hookTypePriorityOrder: HookTypeKind[];
  minRepetitionsAcrossForm: number;
  /** Planning estimate — bars until first hook window. */
  timeToFirstHookBarsEstimate: number;
}

function orderForStyle(primaryStyle: SongwriterRuleId): HookTypeKind[] {
  switch (primaryStyle) {
    case 'max_martin':
    case 'smokey_robinson':
    case 'carole_king':
      return ['melodic', 'rhythmic', 'harmonic', 'lyrical_placeholder'];
    case 'bob_dylan':
    case 'jeff_tweedy':
      return ['lyrical_placeholder', 'melodic', 'rhythmic', 'harmonic'];
    case 'donald_fagen':
    case 'bacharach':
      return ['harmonic', 'melodic', 'rhythmic', 'lyrical_placeholder'];
    default:
      return ['melodic', 'harmonic', 'rhythmic', 'lyrical_placeholder'];
  }
}

export function planHookMetadata(
  seed: number,
  sections: SongSectionPlan[],
  primaryStyle: SongwriterRuleId
): HookPlan {
  const order = orderForStyle(primaryStyle);
  const primaryHookType = order[seed % order.length] as HookTypeKind;
  const verseBars = sections.filter((s) => s.kind === 'verse').length * 4;
  const timeToFirstHookBarsEstimate = Math.min(16, verseBars > 0 ? Math.max(4, verseBars) : 8);
  const minRep =
    primaryStyle === 'max_martin' ? 5 : primaryStyle === 'bob_dylan' ? 2 : 3 + (seed % 3);
  return {
    primaryHookType,
    hookTypePriorityOrder: order,
    minRepetitionsAcrossForm: minRep,
    timeToFirstHookBarsEstimate,
  };
}
