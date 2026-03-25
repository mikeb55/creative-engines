/**
 * Prompt 6.5/7 — Hook planner
 */

import { planHookMetadata } from '../core/song-mode/hookPlanner';
import { planDefaultVerseChorusStructure } from '../core/song-mode/songSectionPlanner';

export function runHookPlannerTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const sections = planDefaultVerseChorusStructure();
  const martin = planHookMetadata(2, sections, 'max_martin');
  const dylan = planHookMetadata(4, sections, 'bob_dylan');
  out.push({
    ok:
      martin.hookTypePriorityOrder.length === 4 &&
      martin.minRepetitionsAcrossForm >= 3 &&
      dylan.primaryHookType === 'lyrical_placeholder',
    name: 'hook planner encodes type priority and style-specific primary hook',
  });

  out.push({
    ok: martin.timeToFirstHookBarsEstimate > 0 && martin.timeToFirstHookBarsEstimate <= 32,
    name: 'time-to-first-hook estimate in range',
  });

  return out;
}
