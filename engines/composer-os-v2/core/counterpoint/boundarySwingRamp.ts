/**
 * Same-family section boundary VRB swing ramp — linear blendedVrb() interpolation.
 */

import { blendedVrb } from './vrbProfiles/blendedVrb';
import { getSqVrbProfile } from './vrbProfiles/sqVrbProfileRegistry';
import type { SqVrbProfile } from './vrbProfiles/sqVrbProfileTypes';
import { dominantComponentId, isSameFamily } from './vrbProfiles/vrbFamilies';

export type RampBar = {
  bar: number;
  vrbProfile: SqVrbProfile;
  weight: [number, number];
};

export const DEFAULT_BOUNDARY_TRANSITION_BARS = 2;

function rampWeightsForIndex(index: number, transitionBars: number): [number, number] {
  const n = transitionBars;
  const step = (index + 1) / (n + 1);
  return [1 - step, step];
}

export function buildBoundaryRamp(
  vrbIdA: string,
  vrbIdB: string,
  transitionBars: number,
  startBar: number,
): RampBar[] {
  if (transitionBars < 1) return [];
  const lookupA = dominantComponentId(vrbIdA);
  const lookupB = dominantComponentId(vrbIdB);
  if (!isSameFamily(lookupA, lookupB)) return [];

  const profileA = getSqVrbProfile(vrbIdA) ?? getSqVrbProfile(lookupA);
  const profileB = getSqVrbProfile(vrbIdB) ?? getSqVrbProfile(lookupB);
  if (!profileA || !profileB) return [];

  const ramp: RampBar[] = [];
  for (let i = 0; i < transitionBars; i++) {
    const weight = rampWeightsForIndex(i, transitionBars);
    const vrbProfile = blendedVrb([profileA, profileB], [weight[0], weight[1]]);
    ramp.push({
      bar: startBar + i,
      vrbProfile,
      weight,
    });
  }
  return ramp;
}

export function getRampProfileForBar(bar: number, ramp: RampBar[]): SqVrbProfile | null {
  for (const entry of ramp) {
    if (entry.bar === bar) return entry.vrbProfile;
  }
  return null;
}
