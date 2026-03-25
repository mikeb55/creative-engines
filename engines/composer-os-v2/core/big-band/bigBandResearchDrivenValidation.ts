/**
 * Validation that era/composer rules are reflected in behaviour metadata (Prompt 5.6/7).
 */

import type { BigBandComposerId, BigBandEraId } from './bigBandResearchTypes';
import type { BigBandDensityPlan } from './bigBandPlanTypes';
import type { BigBandEnhancedPlanning } from './bigBandPlanTypes';
import type { BigBandValidationResult } from './bigBandValidation';
import type { BebopLineBehaviourMetadata } from './bebopLinePlanner';

export function validateResearchDrivenBigBand(
  era: BigBandEraId,
  composerStyle: BigBandComposerId | null,
  densityPlan: BigBandDensityPlan,
  enhanced: BigBandEnhancedPlanning,
  bebopLine: BebopLineBehaviourMetadata | null
): BigBandValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const denseSlices = densityPlan.slices.filter((s) => s.density === 'dense').length;
  const total = densityPlan.slices.length;
  if (era === 'swing') {
    const ratio = denseSlices / Math.max(1, total);
    if (ratio > 0.5) {
      errors.push('swing era: density plan must not be predominantly dense');
    }
  }

  if (era === 'bebop') {
    if (!bebopLine || bebopLine.lineVsRiff !== 'line_primary') {
      errors.push('bebop era: line behaviour metadata must be line-primary');
    }
    const lineSlices = enhanced.behaviourSlices.filter((b) => b.linePrimary);
    if (lineSlices.length < 2) {
      errors.push('bebop era: line-primary behaviour must appear on multiple slices');
    }
  }

  if (composerStyle === 'basie') {
    const n = enhanced.behaviourSlices.filter((b) => b.spaceEmphasis).length;
    if (n < 2) errors.push('basie: space/rest emphasis required on at least two slices');
  }

  if (composerStyle === 'thad') {
    const shout = enhanced.behaviourSlices.find((b) => b.phase === 'shout_chorus');
    if (!shout?.shoutMotivicDevelopment) {
      errors.push('thad: shout must include density-arch + motivic development flag');
    }
  }

  if (composerStyle === 'schneider') {
    if (!enhanced.behaviourSlices.some((b) => b.smoothTransitionToNext)) {
      errors.push('schneider: smooth transitions required between sections');
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
