/**
 * Riff Generator — 2–3 way VRB blend (same family only; cross-family → warn + primary fallback).
 */

import type { RiffProfile, RiffVariationOperator } from '../composer/riffProfileTypes';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type { RiffDensity, RiffGridMode, RiffStyleId } from './riffTypes';
import {
  resolveRiffFamilyTag,
  riffProfileIsComplete,
  type RiffGeneratorVrbId,
} from './riffVrbRegistry';
import { applyRiffDensityToSilenceStyleClass } from './riffDensityPolicy';
import { resolveRiffGeneratorProfileWithMeta } from './resolveRiffGeneratorProfile';

export type RiffBlendPart = { vrbId: string; weight: number };

export type RiffBlendWarning = {
  code: 'cross_family';
  message: string;
  primaryVrbId: string;
  families: string[];
};

export type RiffBlendResult = {
  profile: RiffProfile;
  usedVrbId: string;
  blendedVrbIds: string[];
  warning?: RiffBlendWarning;
};

function normaliseWeights(weights: number[]): number[] {
  const sum = weights.reduce((a, w) => a + w, 0);
  if (sum <= 0) return weights.map(() => 0);
  return weights.map((w) => w / sum);
}

function mergeRiffProfiles(parts: RiffBlendPart[]): RiffProfile {
  const weights = normaliseWeights(parts.map((p) => p.weight));
  const profiles = parts.map((p) => structuredClone(getVoiceRuleBundle(p.vrbId).riffProfile!) as RiffProfile);
  const base = profiles[0]!;
  const slots = base.subdivisionGrid;
  const accent = new Array<number>(slots).fill(0);
  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i]!;
    const w = weights[i]!;
    for (let s = 0; s < slots; s++) {
      accent[s]! += (p.accentTopology[s] ?? 0) * w;
    }
  }
  base.accentTopology = accent;

  const opSet = new Set<RiffVariationOperator>();
  for (const p of profiles) {
    for (const op of p.variationOperators ?? []) opSet.add(op);
  }
  if (opSet.size) base.variationOperators = [...opSet];

  base.pedalBias = profiles.reduce((acc, p, i) => acc + p.pedalBias * weights[i]!, 0);
  base.repetitionPolicy = {
    ...base.repetitionPolicy,
    barIdentityPersistence: profiles.reduce(
      (acc, p, i) => acc + p.repetitionPolicy.barIdentityPersistence * weights[i]!,
      0
    ),
  };

  return base;
}

/**
 * Blend 2–3 riff VRBs. Cross-family attempts warn and return primary VRB profile only.
 */
export function blendRiffGeneratorVrbs(
  parts: RiffBlendPart[],
  opts: { style: RiffStyleId; grid: RiffGridMode; density: RiffDensity },
): RiffBlendResult {
  if (!parts.length) {
    throw new RangeError('blendRiffGeneratorVrbs: at least one part required');
  }
  const primary = parts[0]!.vrbId;
  const families = parts.map((p) => resolveRiffFamilyTag(p.vrbId));
  const firstFamily = families[0];
  const crossFamily = families.some((f) => f !== firstFamily || f === null);

  if (crossFamily || !firstFamily) {
    const meta = resolveRiffGeneratorProfileWithMeta({
      vrbId: primary,
      style: opts.style,
      grid: opts.grid,
      density: opts.density,
    });
    return {
      profile: meta.profile,
      usedVrbId: primary,
      blendedVrbIds: [primary],
      warning: {
        code: 'cross_family',
        message: `Riff VRB blend requires same family; fell back to primary ${primary}`,
        primaryVrbId: primary,
        families: families.map((f) => f ?? 'unknown'),
      },
    };
  }

  const merged = mergeRiffProfiles(parts);
  const baseClass = merged.silencePolicy.styleClass ?? 'riff_vrb_blend';
  merged.silencePolicy = {
    ...merged.silencePolicy,
    styleClass: applyRiffDensityToSilenceStyleClass(baseClass, opts.density),
  };

  const ids = parts.map((p) => p.vrbId).sort() as RiffGeneratorVrbId[];
  return {
    profile: merged,
    usedVrbId: `blended:${ids.join('+')}`,
    blendedVrbIds: ids,
  };
}

export function riffBlendPartsAreValid(parts: RiffBlendPart[]): boolean {
  return (
    parts.length >= 1 &&
    parts.length <= 3 &&
    parts.every((p) => p.weight > 0 && riffProfileIsComplete(getVoiceRuleBundle(p.vrbId).riffProfile))
  );
}
