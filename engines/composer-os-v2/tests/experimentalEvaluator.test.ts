/**
 * Experimental evaluator flags (Prompt 2/2).
 */

import { experimentalLabelForLevel, isExperimentalCreativeLevel } from '../core/creative-controls/experimentalEvaluator';

export function runExperimentalEvaluatorTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok: !isExperimentalCreativeLevel(undefined) && !isExperimentalCreativeLevel('stable'),
    name: 'stable / absent tiers are not experimental',
  });

  out.push({
    ok:
      isExperimentalCreativeLevel('balanced') &&
      experimentalLabelForLevel('surprise') === 'surprise_seed_mutation',
    name: 'balanced/surprise flagged for manifests',
  });

  return out;
}
