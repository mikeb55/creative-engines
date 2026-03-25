/**
 * Composer OS V2 — static module registry (Phase 1A).
 */

import type { ModuleDefinition } from './moduleTypes';

/** Minimal echo module for tests and future bridge stubs. */
export type EchoInput = { message: string };
export type EchoOutput = { message: string };

const echoModule: ModuleDefinition<EchoInput, EchoOutput> = {
  id: 'phase1a_echo',
  category: 'bridge/export',
  input: {} as EchoInput,
  output: {} as EchoOutput,
  run: (input) => ({ message: input.message }),
};

/** Static registry keyed by module id. No dynamic loading. */
export const MODULE_REGISTRY: Record<string, ModuleDefinition<unknown, unknown>> = {
  [echoModule.id]: echoModule as ModuleDefinition<unknown, unknown>,
};

export function getRegisteredModuleIds(): string[] {
  return Object.keys(MODULE_REGISTRY);
}
