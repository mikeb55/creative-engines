/**
 * Composer OS V2 — minimal module invocation types (Phase 1A+1B).
 * Static registry only; no dynamic loading or pipeline integration.
 */

import type { ConductorRole } from '../conductor-alignment/conductorRoleTypes';

export type ModuleCategory =
  | 'melody'
  | 'harmony'
  | 'rhythm'
  | 'counterpoint'
  | 'orchestration'
  | 'songwriting'
  | 'bridge/export';

/** Optional capability metadata for manifests and future orchestration. */
export interface ModuleCapabilities {
  /** Conductor roles this module conceptually reads from. */
  readsFrom?: ConductorRole[];
  /** Conductor roles this module conceptually writes to. */
  writesTo?: ConductorRole[];
  /** Preset ids that are compatible with this module. */
  compatiblePresets?: string[];
  /** Pipeline stage hint (e.g. scaffold, planning). */
  stage?: string;
}

/**
 * Registered module: id, category, input/output contract placeholders, and runner.
 * `input` / `output` are structural placeholders for documentation and typing.
 */
export interface ModuleDefinition<I, O> {
  id: string;
  category: ModuleCategory;
  input: I;
  output: O;
  run: (input: I) => O;
  capabilities?: ModuleCapabilities;
}
