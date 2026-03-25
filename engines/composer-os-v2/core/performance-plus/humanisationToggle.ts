/**
 * Light humanisation — metadata only; never changes pitches or bar math.
 */

import type { HumanisationMetadata } from './densityControlTypes';

export function humanisationOff(): HumanisationMetadata {
  return {
    enabled: false,
    articulationBias: 0,
    rhythmicLooseness: 0,
    sustainAttackBias: 0,
  };
}

export function humanisationOn(lightness: 'subtle' | 'normal' = 'subtle'): HumanisationMetadata {
  const scale = lightness === 'subtle' ? 0.25 : 0.45;
  return {
    enabled: true,
    articulationBias: scale * 0.9,
    rhythmicLooseness: scale * 0.35,
    sustainAttackBias: scale * 0.5,
  };
}
