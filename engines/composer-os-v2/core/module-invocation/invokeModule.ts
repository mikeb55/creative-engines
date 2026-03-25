/**
 * Composer OS V2 — invoke a registered module by id (Phase 1A).
 */

import { MODULE_REGISTRY } from './moduleRegistry';
import type { ModuleDefinition } from './moduleTypes';

export function invokeModule<I, O>(id: string, input: I): O {
  const m = MODULE_REGISTRY[id];
  if (!m) {
    throw new Error(`Unknown module id: ${id}`);
  }
  return (m as ModuleDefinition<I, O>).run(input);
}
