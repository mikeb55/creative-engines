/**
 * Mosaic Phrase Planner — unit tests.
 */

import {
  buildPhraseRoleHints,
  resolvePhraseRole,
} from '../core/mosaic-mode/mosaicPhrasePlanner';
import type { MosaicModeSectionPlanEntry } from '../core/mosaic-mode/precomputeMosaicEffectiveHarmonyBars';

export function runMosaicPhrasePlannerTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const base: MosaicModeSectionPlanEntry = {
    sectionLabel: 'intro',
    startBar: 1,
    endBar: 16,
    songwriterStyleId: 'fripp',
  };

  out.push({
    ok: resolvePhraseRole(base) === null,
    name: 'resolvePhraseRole: absent → null',
  });

  out.push({
    ok: resolvePhraseRole({ ...base, phraseRole: 'statement' }) === 'statement',
    name: 'resolvePhraseRole: statement passthrough',
  });

  const statement = buildPhraseRoleHints('statement');
  out.push({
    ok:
      statement.densityMultiplier === 0.75 &&
      statement.dynamicShift === 0 &&
      statement.motifProminence === 'lead',
    name: 'buildPhraseRoleHints: statement',
  });

  const development = buildPhraseRoleHints('development');
  out.push({
    ok:
      development.densityMultiplier === 1.1 &&
      development.dynamicShift === 0 &&
      development.motifProminence === 'support',
    name: 'buildPhraseRoleHints: development',
  });

  const climax = buildPhraseRoleHints('climax');
  out.push({
    ok:
      climax.densityMultiplier === 1.3 &&
      climax.dynamicShift === 1 &&
      climax.motifProminence === 'lead',
    name: 'buildPhraseRoleHints: climax',
  });

  const release = buildPhraseRoleHints('release');
  out.push({
    ok:
      release.densityMultiplier === 0.6 &&
      release.dynamicShift === -1 &&
      release.motifProminence === 'absent',
    name: 'buildPhraseRoleHints: release',
  });

  return out;
}

if (require.main === module) {
  const results = runMosaicPhrasePlannerTests();
  let failed = 0;
  for (const r of results) {
    if (!r.ok) {
      failed++;
      console.error('FAIL', r.name);
    } else {
      console.log('PASS', r.name);
    }
  }
  process.exit(failed > 0 ? 1 : 0);
}
