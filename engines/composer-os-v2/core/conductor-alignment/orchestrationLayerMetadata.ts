/**
 * Declarative metadata for the shared orchestration layer (Prompt 4/7).
 * No runtime routing — documents alignment with conductor roles and handoffs.
 */

import type { ConductorRole } from './conductorRoleTypes';

/** Static descriptor for tooling and future orchestration modules. */
export const ORCHESTRATION_SHARED_LAYER = {
  version: '1',
  /** Aligns with `HandoffModuleCategory` orchestration + module registry category. */
  handoffCategory: 'orchestration' as const,
  /** Planning-only stage id (not a pipeline step today). */
  planningStage: 'orchestration_planning',
  /** Typical upstream conductor roles consumed by orchestration planners. */
  readsConductorRoles: ['register', 'density'] as const satisfies readonly ConductorRole[],
  /** Downstream artifacts are planning objects, not score mutations. */
  producesPlanningArtifacts: ['orchestration_plan', 'register_ownership', 'texture_ownership', 'density_ownership'] as const,
} as const;
