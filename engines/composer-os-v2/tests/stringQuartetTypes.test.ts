/**
 * String quartet core types (Prompt 6/7).
 */

import { QUARTET_INSTRUMENTS } from '../core/string-quartet/stringQuartetTypes';
import type { QuartetRoleType } from '../core/string-quartet/quartetRoleTypes';

const ROLES: QuartetRoleType[] = [
  'lead',
  'counterline',
  'inner_motion',
  'harmonic_support',
  'bass_anchor',
  'sustain_pad',
  'silence',
];

export function runStringQuartetTypesTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok:
      QUARTET_INSTRUMENTS.length === 4 &&
      QUARTET_INSTRUMENTS.includes('violin_1') &&
      QUARTET_INSTRUMENTS.includes('violin_2') &&
      QUARTET_INSTRUMENTS.includes('viola') &&
      QUARTET_INSTRUMENTS.includes('cello'),
    name: 'quartet instruments are violin_1, violin_2, viola, cello',
  });

  out.push({
    ok: ROLES.length === 7,
    name: 'quartet role vocabulary has seven entries',
  });

  return out;
}
