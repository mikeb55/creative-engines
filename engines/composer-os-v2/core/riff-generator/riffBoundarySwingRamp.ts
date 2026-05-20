/**
 * Riff Generator — same-family boundary swing ramp (family-tagged lookup).
 * funk + rock → straight/shuffle ramp; fusion + art_rock → odd-meter ramp (no swing).
 */

import type { RiffProfile } from '../composer/riffProfileTypes';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type { RiffFamilyTag } from './riffVrbRegistry';
import {
  resolveRiffFamilyTag,
  riffFamilyAllowsOddMeterOverlay,
  type RiffGeneratorVrbId,
} from './riffVrbRegistry';
import { riffStyleIdForFamily } from './resolveRiffGeneratorProfile';
import type { RiffGridMode, RiffStyleId } from './riffTypes';

export type RiffBoundarySwingRampKind = 'straight_shuffle' | 'odd_meter';

export type RiffBoundaryRampBar = {
  bar: number;
  weight: [number, number];
  rampKind: RiffBoundarySwingRampKind;
  swingStyle: 'straight' | 'shuffle' | 'none';
  profileA: RiffProfile;
  profileB: RiffProfile;
};

export function riffBoundarySwingRampKindForFamily(family: RiffFamilyTag): RiffBoundarySwingRampKind {
  return riffFamilyAllowsOddMeterOverlay(family) ? 'odd_meter' : 'straight_shuffle';
}

function rampWeightsForIndex(index: number, transitionBars: number): [number, number] {
  const step = (index + 1) / (transitionBars + 1);
  return [1 - step, step];
}

function swingStyleForRampKind(kind: RiffBoundarySwingRampKind, profile: RiffProfile): 'straight' | 'shuffle' | 'none' {
  if (kind === 'odd_meter') return 'none';
  if (profile.swingStyle === 'shuffle' || profile.swingStyle === 'funk16th') return 'shuffle';
  return 'straight';
}

function cloneProfile(vrbId: string): RiffProfile | null {
  const b = getVoiceRuleBundle(vrbId);
  if (!b.riffProfile) return null;
  return structuredClone(b.riffProfile) as RiffProfile;
}

/**
 * Build transition bars between two riff VRBs (same family only).
 */
export function buildRiffBoundaryRamp(
  vrbIdA: string,
  vrbIdB: string,
  transitionBars: number,
  startBar = 0,
): RiffBoundaryRampBar[] {
  if (transitionBars < 1) return [];
  const familyA = resolveRiffFamilyTag(vrbIdA);
  const familyB = resolveRiffFamilyTag(vrbIdB);
  if (!familyA || familyB !== familyA) return [];

  const profileA = cloneProfile(vrbIdA);
  const profileB = cloneProfile(vrbIdB);
  if (!profileA || !profileB) return [];

  const rampKind = riffBoundarySwingRampKindForFamily(familyA);
  const ramp: RiffBoundaryRampBar[] = [];
  for (let i = 0; i < transitionBars; i++) {
    const weight = rampWeightsForIndex(i, transitionBars);
    const swingA = swingStyleForRampKind(rampKind, profileA);
    ramp.push({
      bar: startBar + i,
      weight,
      rampKind,
      swingStyle: weight[0] >= weight[1] ? swingA : swingStyleForRampKind(rampKind, profileB),
      profileA,
      profileB,
    });
  }
  return ramp;
}

/** Receipt line for manifests / UI when a riff boundary ramp is active. */
export function riffBoundaryRampReceiptLine(
  vrbIdA: RiffGeneratorVrbId,
  vrbIdB: RiffGeneratorVrbId,
  transitionBars: number,
): string | null {
  const ramp = buildRiffBoundaryRamp(vrbIdA, vrbIdB, transitionBars, 0);
  if (!ramp.length) return null;
  const kind = ramp[0]!.rampKind;
  return `riff_boundary_ramp ${vrbIdA}->${vrbIdB} bars=${transitionBars} kind=${kind}`;
}

export function riffStyleForFamilyTag(family: RiffFamilyTag): RiffStyleId {
  return riffStyleIdForFamily(family);
}

export function defaultRiffGridForFamily(_family: RiffFamilyTag): RiffGridMode {
  return 'eighth';
}
