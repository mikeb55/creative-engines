/**
 * Section regeneration bar-range planning.
 */

import { validateSectionRegenerationBarRange } from '../core/regeneration/sectionRegenerationPlanning';

export function runSectionRegenerationPlanningTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const okRange = validateSectionRegenerationBarRange({
    spec: { startBar: 3, endBar: 5 },
    totalBars: 8,
    fullChordBarCount: 8,
    locks: undefined,
    formId: undefined,
  });
  out.push({
    ok: okRange.ok === true,
    name: 'planning accepts valid range',
  });

  const badMelody = validateSectionRegenerationBarRange({
    spec: { startBar: 1, endBar: 2 },
    totalBars: 8,
    fullChordBarCount: 8,
    locks: { melody: true },
    formId: undefined,
  });
  out.push({
    ok: badMelody.ok === false,
    name: 'melody lock rejects regeneration',
  });

  const badBounds = validateSectionRegenerationBarRange({
    spec: { startBar: 1, endBar: 9 },
    totalBars: 8,
    fullChordBarCount: 8,
    locks: undefined,
    formId: undefined,
  });
  out.push({
    ok: badBounds.ok === false,
    name: 'endBar beyond totalBars rejected',
  });

  return out;
}
