/**
 * Composer OS V2 — static module registry (Phase 1A+1B).
 */

import type { ModuleCapabilities, ModuleDefinition } from './moduleTypes';

/** Minimal echo module for tests and future bridge stubs. */
export type EchoInput = { message: string };
export type EchoOutput = { message: string };

const echoModule: ModuleDefinition<EchoInput, EchoOutput> = {
  id: 'phase1a_echo',
  category: 'bridge/export',
  input: {} as EchoInput,
  output: {} as EchoOutput,
  run: (input) => ({ message: input.message }),
  capabilities: {
    readsFrom: ['validation'],
    writesTo: ['export'],
    compatiblePresets: ['guitar_bass_duo', 'ecm_chamber', 'song_mode'],
    stage: 'bridge',
  },
};

export type SongModeScaffoldIn = { structureHint?: string };
export type SongModeScaffoldOut = { structureHint?: string };

/** Song Mode section scaffold — metadata only, no harmony engine. */
const songModeScaffoldModule: ModuleDefinition<SongModeScaffoldIn, SongModeScaffoldOut> = {
  id: 'song_mode_scaffold',
  category: 'songwriting',
  input: {} as SongModeScaffoldIn,
  output: {} as SongModeScaffoldOut,
  run: (input) => ({ structureHint: input.structureHint ?? 'default_verse_chorus' }),
  capabilities: {
    readsFrom: ['form', 'motif'],
    writesTo: ['form'],
    compatiblePresets: ['song_mode'],
    stage: 'scaffold',
  },
};

/** Static registry keyed by module id. No dynamic loading. */
export const MODULE_REGISTRY: Record<string, ModuleDefinition<unknown, unknown>> = {
  [echoModule.id]: echoModule as ModuleDefinition<unknown, unknown>,
  [songModeScaffoldModule.id]: songModeScaffoldModule as ModuleDefinition<unknown, unknown>,
};

export function getRegisteredModuleIds(): string[] {
  return Object.keys(MODULE_REGISTRY);
}

export function getModuleCapabilities(id: string): ModuleCapabilities | undefined {
  return MODULE_REGISTRY[id]?.capabilities;
}
