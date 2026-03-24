/**
 * Composer OS V2 — Style module registry
 */

import type { StyleModule, StyleStack } from './styleModuleTypes';
import type { CompositionContext } from '../compositionContext';
import { styleStackToModuleIds } from './styleModuleTypes';
import { barryHarrisModule } from './barry-harris/moduleApply';
import { methenyModule } from './metheny/moduleApply';
import { triadPairsModule } from './triad-pairs/moduleApply';

const registry = new Map<string, StyleModule>();

function registerBuiltIn(): void {
  if (registry.size > 0) return;
  registerStyleModule(barryHarrisModule);
  registerStyleModule(methenyModule);
  registerStyleModule(triadPairsModule);
}
registerBuiltIn();

export function registerStyleModule(module: StyleModule): void {
  registry.set(module.id, module);
}

export function getStyleModule(id: string): StyleModule | undefined {
  return registry.get(id);
}

/** Apply style stack. Order: primary, secondary, colour. */
export function applyStyleStack(context: CompositionContext, stack: StyleStack): CompositionContext {
  const ids = styleStackToModuleIds(stack);
  let result = context;
  for (const id of ids) {
    const mod = registry.get(id);
    if (mod) result = mod.modify(result);
  }
  return result;
}

/** Apply modules by id list (legacy). */
export function applyStyleModules(
  context: CompositionContext,
  moduleIds: string[]
): CompositionContext {
  let result = context;
  for (const id of moduleIds) {
    const mod = registry.get(id);
    if (mod) result = mod.modify(result);
  }
  return result;
}
