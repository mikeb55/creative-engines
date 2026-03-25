/**
 * Contour selection per phrase from hook + section role.
 */

import type { HookPlan } from './hookPlanner';
import type { LeadMelodyContourArc, MelodyContourKind } from './leadMelodyTypes';
import type { SongSectionKind } from './songModeTypes';

export function contourForPhrase(
  sectionKind: SongSectionKind,
  hookPlan: HookPlan,
  seed: number,
  phraseIndex: number
): MelodyContourKind {
  if (sectionKind === 'chorus') {
    return hookPlan.primaryHookType === 'melodic' ? 'arch' : 'wave';
  }
  if (sectionKind === 'bridge') return 'descending';
  if (sectionKind === 'pre_chorus') return 'ascending';
  const roll = (seed + phraseIndex * 17) % 4;
  const base: MelodyContourKind[] = ['arch', 'wave', 'ascending', 'arch'];
  return base[roll];
}

export function overallContourArc(seed: number): LeadMelodyContourArc {
  const r = seed % 3;
  if (r === 0) return 'rising';
  if (r === 1) return 'falling';
  return 'balanced';
}
