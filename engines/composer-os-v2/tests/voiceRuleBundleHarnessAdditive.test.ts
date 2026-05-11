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
  const okGil =
    ge.voiceId === 'gil_evans' &&
    ge.repairPolicy.resolveParallels === true &&
    ge.repairPolicy.maxVoiceOverlap >= 0 &&
    (ge.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 10;

  const duke = getVoiceRuleBundle('duke_ellington');
  const okDuke =
    duke.voiceId === 'duke_ellington' && (duke.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 10;

  const ws = getVoiceRuleBundle('wayne_shorter');
  const okWsFp =
    ws.voiceId === 'wayne_shorter' && (ws.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 10;

  const ms = getVoiceRuleBundle('maria_schneider');
  const okMsFp =
    ms.voiceId === 'maria_schneider' && (ms.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 10;

  const berg = getVoiceRuleBundle('berg');
  const okBerg =
    berg.voiceId === 'berg' &&
    berg.bergVoiceLeading?.rowClarityLevel === 'balanced' &&
    (berg.bergVoiceLeading?.contrapuntalStrandTarget ?? 0) >= 4;

  const nestico = getVoiceRuleBundle('sammy_nestico');
  const okNestico =
    nestico.voiceId === 'sammy_nestico' &&
    (nestico.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 6;

  const brook = getVoiceRuleBundle('bob_brookmeyer');
  const okBrook =
    brook.voiceId === 'bob_brookmeyer' && (brook.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 6;

  const fischer = getVoiceRuleBundle('clare_fischer');
  const okFischer =
    fischer.voiceId === 'clare_fischer' && (fischer.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 6;

  const nelson = getVoiceRuleBundle('oliver_nelson');
  const okNelson =
    nelson.voiceId === 'oliver_nelson' && (nelson.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 6;

  const quincy = getVoiceRuleBundle('quincy_jones');
  const okQuincy =
    quincy.voiceId === 'quincy_jones' && (quincy.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 6;

  const basie = getVoiceRuleBundle('count_basie');
  const okBasie =
    basie.voiceId === 'count_basie' && (basie.orchestrationPolicy.fingerprintReceipts?.length ?? 0) >= 8;

  return [
    { name: 'Phase 2+3a harness additive: HarmonicScene stub barRange', ok: okScene },
    { name: 'Phase 2+3a harness additive: unknown voice → neutral bundle id', ok: okNeutral },
    { name: 'Phase 2+3a harness additive: gil_evans repairPolicy + ≥10 fingerprints', ok: okGil },
    { name: 'Phase 2+3a harness additive: duke_ellington ≥10 fingerprints', ok: okDuke },
    { name: 'Phase 2+3a harness additive: wayne_shorter ≥10 fingerprints', ok: okWsFp },
    { name: 'Phase 2+3a harness additive: maria_schneider ≥10 fingerprints', ok: okMsFp },
    { name: 'Phase 2+3a harness additive: berg bundle + row clarity', ok: okBerg },
    { name: 'Phase 2+3a harness additive: sammy_nestico fingerprints', ok: okNestico },
    { name: 'Phase 2+3a harness additive: bob_brookmeyer fingerprints', ok: okBrook },
    { name: 'Phase 2+3a harness additive: clare_fischer fingerprints', ok: okFischer },
    { name: 'Phase 2+3a harness additive: oliver_nelson fingerprints', ok: okNelson },
    { name: 'Phase 2+3a harness additive: quincy_jones fingerprints', ok: okQuincy },
    { name: 'Phase 2+3a harness additive: count_basie fingerprints', ok: okBasie },
  ];
}
