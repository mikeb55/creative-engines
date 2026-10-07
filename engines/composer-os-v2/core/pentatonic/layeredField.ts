/**
 * Dev 7D LAYERED_FIELD.
 * Guitar and bass share one governing colour and take different subsets.
 * This is not a second phrase engine and not two simultaneous fields.
 */

import type { PentatonicField } from './fieldDistance';

export const PENTATONIC_LAYERED_FIELD_VERSION = 'pentatonic-layered-field-7d';

export const LAYER_ROLES = [
  'GUITAR_SLOW_BASS_ACTIVE',
  'GUITAR_ACTIVE_BASS_SLOW',
  'CALL_RESPONSE',
  'COUNTERPOINT',
  'SHARED_SPACE',
] as const;

export type LayerRole = (typeof LAYER_ROLES)[number];

export interface LayeredFieldPlan {
  version: typeof PENTATONIC_LAYERED_FIELD_VERSION;
  governingField: PentatonicField;
  guitarSubset: readonly number[];
  bassSubset: readonly number[];
  registerRelation: 'BASS_BELOW_GUITAR' | 'SHARED_REGISTER' | 'SILENT';
  densityRelation: string;
  roleRelation: LayerRole;
  sameGoverningField: true;
  tempoIgnored: true;
}

export function planLayeredField(request: {
  field: PentatonicField;
  role?: LayerRole;
  /** Accepted and ignored. A tempo change does not add notes. */
  tempo?: number;
}): LayeredFieldPlan {
  const role = request.role ?? 'GUITAR_ACTIVE_BASS_SLOW';
  const degrees = [...request.field.pitchClasses];
  const root = request.field.referencePc;
  const ordered = degrees.sort((left, right) => modDistance(left, root) - modDistance(right, root) || left - right);
  if (role === 'SHARED_SPACE') {
    return {
      version: PENTATONIC_LAYERED_FIELD_VERSION,
      governingField: request.field,
      guitarSubset: [],
      bassSubset: [],
      registerRelation: 'SILENT',
      densityRelation: 'Both layers rest inside the governing field.',
      roleRelation: role,
      sameGoverningField: true,
      tempoIgnored: true,
    };
  }
  const bassCount = role === 'GUITAR_SLOW_BASS_ACTIVE' || role === 'COUNTERPOINT' ? 3 : 2;
  const guitarCount = role === 'GUITAR_SLOW_BASS_ACTIVE' ? 2 : 3;
  const bassSubset = ordered.slice(0, bassCount);
  const guitarPool = ordered.filter((pc) => !bassSubset.includes(pc));
  const guitarSubset = (guitarPool.length >= guitarCount ? guitarPool : ordered.slice(-guitarCount)).slice(0, guitarCount);
  return {
    version: PENTATONIC_LAYERED_FIELD_VERSION,
    governingField: request.field,
    guitarSubset,
    bassSubset,
    registerRelation: 'BASS_BELOW_GUITAR',
    densityRelation: `${guitarSubset.length} guitar notes, ${bassSubset.length} bass notes, one field.`,
    roleRelation: role,
    sameGoverningField: true,
    tempoIgnored: true,
  };
}

function modDistance(pc: number, root: number): number {
  return (pc - root + 12) % 12;
}

export const DEV7_DEFERRED = [
  {
    id: 'BIMODAL_DUO',
    reason: 'Layered field, graded out, and pivot link already cover a shared field and a move between fields. A second simultaneous field is a different piece of work and stays deferred.',
  },
  {
    id: 'RHYTHMIC_GROUPING',
    reason: 'Five-against-four and generic pentatonic grouping would become lick generation. Deferred.',
  },
  {
    id: 'FIELD_WALK',
    reason: 'One-note drift is reported by assessFieldWalkStrategy when subtle graded moves produce it. It is not an operator.',
  },
] as const;
