/**
 * Apply resolved era/composer rules to planning outputs (metadata only).
 */

import type { BigBandDensityPlan, BigBandEnhancedPlanning, BigBandFormPlan } from './bigBandPlanTypes';
import type { BebopLineBehaviourMetadata } from './bebopLinePlanner';
import type { ResolvedBigBandRuleSet } from './bigBandResearchTypes';

export function applyBigBandRules(input: {
  formPlan: BigBandFormPlan;
  densityPlan: BigBandDensityPlan;
  resolved: ResolvedBigBandRuleSet;
  bebopLine: BebopLineBehaviourMetadata | null;
  seed: number;
}): BigBandEnhancedPlanning {
  const { formPlan, densityPlan, resolved, bebopLine } = input;
  void input.seed;

  const behaviourSlices = formPlan.slices.map((s, idx) => {
    const dens = densityPlan.slices.find((d) => d.formSliceIndex === s.index)?.density ?? 'moderate';
    const comp = resolved.composerStyle;

    let spaceEmphasis =
      resolved.tuning.spaceEmphasis >= 0.45 && (s.phase === 'solo_section' || dens === 'sparse');
    if (comp === 'basie') {
      spaceEmphasis = s.phase === 'intro' || s.phase === 'solo_section' || s.phase === 'melody_head';
    }

    let linePrimary = false;
    let riffPrimary = false;
    if (bebopLine && bebopLine.lineVsRiff === 'line_primary') {
      linePrimary =
        s.phase === 'melody_head' || s.phase === 'solo_section' || s.phase === 'shout_chorus';
    }
    if (resolved.tuning.riffVsLine === 'riff_primary' && !bebopLine) {
      riffPrimary = s.phase === 'melody_head' || s.phase === 'background_figures';
    }
    if (resolved.tuning.riffVsLine === 'balanced' && !bebopLine) {
      riffPrimary = s.phase === 'background_figures';
      linePrimary = s.phase === 'melody_head' || s.phase === 'solo_section';
    }

    const smoothTransitionToNext =
      resolved.tuning.smoothTransitions && idx < formPlan.slices.length - 1;

    const shoutMotivicDevelopment =
      s.phase === 'shout_chorus' && resolved.tuning.shoutMotivicClimax;

    return {
      formSliceIndex: s.index,
      phase: s.phase,
      spaceEmphasis,
      linePrimary,
      riffPrimary,
      smoothTransitionToNext,
      shoutMotivicDevelopment,
    };
  });

  return { behaviourSlices };
}
