/**
 * Composer OS V2 — Register map validation
 */

import type { InstrumentRegisterMap } from './registerMapTypes';

export interface RegisterMapValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRegisterMap(map: InstrumentRegisterMap): RegisterMapValidationResult {
  const errors: string[] = [];
  for (const s of map.sections) {
    if (s.preferredZone[0] > s.preferredZone[1]) errors.push(`Invalid preferred zone for ${s.sectionLabel}`);
    if (s.dangerZone[0] > s.dangerZone[1]) errors.push(`Invalid danger zone for ${s.sectionLabel}`);
  }
  return { valid: errors.length === 0, errors };
}
