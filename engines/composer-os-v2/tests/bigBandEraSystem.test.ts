/**
 * Big Band era + composer resolution (Prompt 5.6/7).
 */

import { resolveBigBandEraRules } from '../core/big-band/bigBandEraResolver';
import { runBigBandMode } from '../core/big-band/runBigBandMode';

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

  return out;
}
