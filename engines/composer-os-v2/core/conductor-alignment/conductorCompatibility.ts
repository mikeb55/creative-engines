/**
 * Declarative compatibility notes for conductor roles (ordering, typical coupling).
 * No runtime enforcement — documentation for future wiring.
 */

import type { ConductorRole } from './conductorRoleTypes';

/** Suggested pipeline order when roles are composed in sequence. */
export const CONDUCTOR_ROLE_PIPELINE_ORDER: readonly ConductorRole[] = [
  'form',
  'feel_rhythm',
  'density',
  'register',
  'motif',
  'style',
  'interaction',
  'instrument_behaviour',
  'score_model',
  'validation',
  'export',
];

/** Roles that typically consume output of others (downstream). */
export const DOWNSTREAM_CONDUCTOR_ROLES: readonly ConductorRole[] = [
  'score_model',
  'validation',
  'export',
];

/** Roles that typically feed material into score generation (upstream of score_model). */
export const UPSTREAM_OF_SCORE_MODEL: readonly ConductorRole[] = [
  'form',
  'feel_rhythm',
  'density',
  'register',
  'motif',
  'style',
  'interaction',
  'instrument_behaviour',
];

export function roleIndex(role: ConductorRole): number {
  return CONDUCTOR_ROLE_PIPELINE_ORDER.indexOf(role);
}
