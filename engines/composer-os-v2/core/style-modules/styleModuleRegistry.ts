/**
 * Composer OS V2 — Style module registry
 */

import type { StyleModule } from './styleModuleTypes';
import type { CompositionContext } from '../compositionContext';
import { barryHarrisModule } from './barry-harris/moduleApply';

const registry = new Map<string, StyleModule>();

function registerBuiltIn(): void {
  if (registry.size > 0) return;
  registerStyleModule(barryHarrisModule);
}
registerBuiltIn();

/** Register a style module. */
export function registerStyleModule(module: StyleModule): void {
  registry.set(module.id, module);
}

/** Get registered module by id. */
export function getStyleModule(id: string): StyleModule | undefined {
  return registry.get(id);
}

/** Style weighting config. */
export interface StyleWeighting {
  primary: string;
  weight: number;
}

/** Apply registered modules. */
export function applyStyleModules(
  context: CompositionContext,
  moduleIds: string[],
  _weighting?: StyleWeighting
): CompositionContext {
  let result = context;
  for (const id of moduleIds) {
    const mod = registry.get(id);
    if (mod) result = mod.modify(result);
  }
  return result;
}
