/**
 * Big Band era + composer resolution (Prompt 5.6/7).
 */

import { resolveBigBandEraRules } from '../core/big-band/bigBandEraResolver';
import { runBigBandMode } from '../core/big-band/runBigBandMode';
import type { BigBandArrangerProfileReceiptV1 } from '../core/big-band/bigBandResearchTypes';

export function runBigBandEraSystemTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const swing = resolveBigBandEraRules('swing', null, true, []);
  out.push({
    ok: swing.tuning.riffVsLine === 'riff_primary' && swing.ruleIds.includes('swing.form_templates'),
    name: 'swing era resolves riff-primary tuning',
  });

  const bebop = resolveBigBandEraRules('bebop', null, true, []);
  out.push({
    ok: bebop.tuning.riffVsLine === 'line_primary',
    name: 'bebop era resolves line-primary tuning',
  });

  const basie = runBigBandMode({ seed: 3, era: 'swing', composerStyle: 'basie' });
  out.push({
    ok: basie.validation.ok && basie.composerStyle === 'basie',
    name: 'swing + basie: validation passes with space emphasis',
  });

  const thad = runBigBandMode({ seed: 4, era: 'post_bop', composerStyle: 'thad' });
  out.push({
    ok: thad.validation.ok && thad.resolvedRules.tuning.densityArc === true,
    name: 'post_bop + thad: density arc + shout flags',
  });

  const thadRec = thad.resolvedRules.tuning.thadProofOfConcept as BigBandArrangerProfileReceiptV1 | undefined;
  out.push({
    ok:
      thad.validation.ok &&
      thadRec != null &&
      thadRec.chordDensity === 4 &&
      thadRec.functionalHarmonyPercent === 72,
    name: 'post_bop + thad: arranger profile receipt (parameter table)',
  });

  const gil = resolveBigBandEraRules('cool_jazz', 'gil_evans', true, []);
  const gilRec = gil.tuning.gilEvansProofOfConcept;
  out.push({
    ok:
      gil.composerStyle === 'gil_evans' &&
      gilRec != null &&
      gilRec.functionalHarmonyPercent === 48 &&
      gilRec.timeFeel.includes('elastic'),
    name: 'cool_jazz + gil_evans: tuning receipt + registry merge',
  });

  return out;
}
