/**
 * Composer OS V2 — Style module registry
 * Registers style modules; applies them in order as modifiers.
 */

import type { StyleModule } from './styleModuleTypes';
import type { CompositionContext } from '../compositionContext';

const registry = new Map<string, StyleModule>();

/** Register a style module. */
export function registerStyleModule(module: StyleModule): void {
  registry.set(module.id, module);
}

/** Get registered module by id. */
export function getStyleModule(id: string): StyleModule | undefined {
  return registry.get(id);
}

/** Apply registered modules to context in order. */
export function applyStyleModules(
  context: CompositionContext,
  moduleIds: string[]
): CompositionContext {
  let result = context;
  for (const id of moduleIds) {
    const mod = registry.get(id);
    if (mod) {
      result = mod.modify(result);
    }
  }
  return result;
}
