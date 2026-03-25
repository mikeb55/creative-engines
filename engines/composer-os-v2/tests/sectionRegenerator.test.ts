/**
 * Section regeneration.
 */

import { planSectionRegeneration } from '../core/regeneration/sectionRegenerator';
import { validateSectionRegenerationRequest } from '../core/regeneration/regenerationValidation';

export function runSectionRegeneratorTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const v = validateSectionRegenerationRequest({ target: 'chorus' });
  out.push({
    ok: v.ok,
    name: 'regeneration validation accepts chorus',
  });

  const p = planSectionRegeneration({ target: 'bridge', locks: { motif: true } });
  out.push({
    ok: p.ok && p.canRegenerate,
    name: 'section regenerator allows bridge with partial locks',
  });

  const bad = validateSectionRegenerationRequest({ target: '' });
  out.push({
    ok: !bad.ok,
    name: 'negative: empty section target',
  });

  const badPlan = planSectionRegeneration({ target: 'shout_chorus', locks: { form: true } });
  out.push({
    ok: badPlan.ok && !badPlan.canRegenerate,
    name: 'form lock blocks regeneration',
  });

  return out;
}
