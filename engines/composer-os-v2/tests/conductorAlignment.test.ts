/**
 * Conductor alignment metadata (Prompt 2/7).
 */

import { allConductorRolesFromStageMap, COMPOSER_OS_STAGE_TO_CONDUCTOR_ROLES } from '../core/conductor-alignment/conductorRoleMap';
import { CONDUCTOR_ROLE_PIPELINE_ORDER } from '../core/conductor-alignment/conductorCompatibility';
import type { ConductorRole } from '../core/conductor-alignment/conductorRoleTypes';

const EXPECTED_ROLES: ConductorRole[] = [
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

export function runConductorAlignmentTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok: COMPOSER_OS_STAGE_TO_CONDUCTOR_ROLES.length === EXPECTED_ROLES.length,
    name: 'conductor role map has one stage per core pipeline area',
  });

  const mapped = allConductorRolesFromStageMap().sort().join(',');
  const expectedSorted = [...EXPECTED_ROLES].sort().join(',');
  out.push({
    ok: mapped === expectedSorted,
    name: 'role map covers all conductor roles',
  });

  out.push({
    ok: CONDUCTOR_ROLE_PIPELINE_ORDER.length === EXPECTED_ROLES.length,
    name: 'compatibility pipeline order lists all roles',
  });

  return out;
}
