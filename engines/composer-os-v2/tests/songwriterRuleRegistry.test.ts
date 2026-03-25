/**
 * Prompt 6.5/7 — Songwriter rule registry
 */

import { SONGWRITER_RULE_REGISTRY, allRegistryRuleIds } from '../core/song-mode/songwriterRuleRegistry';
import type { SongwriterRuleId } from '../core/song-mode/songwritingResearchTypes';

export function runSongwriterRuleRegistryTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const ids: SongwriterRuleId[] = [
    'bacharach',
    'stevie_wonder',
    'beatles',
    'joni_mitchell',
    'donald_fagen',
    'bob_dylan',
    'paul_simon',
    'jeff_tweedy',
    'carole_king',
    'smokey_robinson',
    'randy_newman',
    'richard_thompson',
    'max_martin',
  ];
  out.push({
    ok: ids.every((id) => SONGWRITER_RULE_REGISTRY.songwriterRules[id].length >= 3),
    name: 'songwriter rule registry populated for all songwriters',
  });

  out.push({
    ok:
      SONGWRITER_RULE_REGISTRY.authorRules.jimmy_webb.length >= 2 &&
      SONGWRITER_RULE_REGISTRY.authorRules.pat_pattison.length >= 2 &&
      SONGWRITER_RULE_REGISTRY.authorRules.jack_perricone.length >= 2,
    name: 'author rules populated',
  });

  out.push({
    ok:
      SONGWRITER_RULE_REGISTRY.classicalSongRules.schubert.length >= 2 &&
      SONGWRITER_RULE_REGISTRY.foundationalRules.hook.length >= 2,
    name: 'classical + foundational rules populated',
  });

  out.push({
    ok: allRegistryRuleIds().length >= 80,
    name: 'registry exposes many stable rule ids',
  });

  return out;
}
