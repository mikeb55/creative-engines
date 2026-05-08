/**
 * Phase 2+3a additive harness checks (full tier only — keeps smoke allowlist unchanged).
 * Does not duplicate `voiceRuleBundle.test.ts` smoke suite.
 */

import { buildHarmonicSceneStubs } from '../core/composer/harmonicScene';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';

export function runVoiceRuleBundleHarnessAdditiveTests(): { name: string; ok: boolean }[] {
  const scenes = buildHarmonicSceneStubs({
    sections: [{ label: 'A', startBar: 1, length: 8 }],
    totalBars: 8,
  });
  const okScene =
    scenes.length === 1 && scenes[0]!.barRange[0] === 1 && scenes[0]!.barRange[1] === 8 && scenes[0]!.tensionLevel >= 0;

  const okNeutral = getVoiceRuleBundle('unknown_writer_phase23a').voiceId === 'neutral';

  const ge = getVoiceRuleBundle('gil_evans');
  const okRepair = ge.repairPolicy.resolveParallels === true && ge.repairPolicy.maxVoiceOverlap >= 0;

  return [
    { name: 'Phase 2+3a harness additive: HarmonicScene stub barRange', ok: okScene },
    { name: 'Phase 2+3a harness additive: unknown voice → neutral bundle id', ok: okNeutral },
    { name: 'Phase 2+3a harness additive: gil_evans repairPolicy gate', ok: okRepair },
  ];
}
