/**
 * Handoff map declarative contracts (Prompt 2/7).
 */

import { HANDOFF_CATEGORIES, HANDOFF_MAP, handoffEntryForCategory } from '../core/conductor-alignment/handoffMap';
import type { ModuleCategory } from '../core/module-invocation/moduleTypes';

const MODULE_CATEGORIES: ModuleCategory[] = [
  'melody',
  'harmony',
  'rhythm',
  'counterpoint',
  'orchestration',
  'songwriting',
  'bridge/export',
];

export function runHandoffMapTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const match =
    HANDOFF_CATEGORIES.length === MODULE_CATEGORIES.length &&
    MODULE_CATEGORIES.every((c) => HANDOFF_CATEGORIES.includes(c));

  out.push({
    ok: match,
    name: 'handoff map categories align with module invocation categories',
  });

  out.push({
    ok: HANDOFF_MAP.every((e) => e.contractName.length > 0 && e.category === handoffEntryForCategory(e.category)?.category),
    name: 'handoff map entries are self-consistent',
  });

  const orch = HANDOFF_MAP.find((e) => e.category === 'orchestration');
  out.push({
    ok: orch?.orchestrationPlanningStage === 'orchestration_planning',
    name: 'orchestration handoff entry declares orchestration planning stage',
  });

  return out;
}
