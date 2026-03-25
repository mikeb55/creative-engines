/**
 * BigBandResearch.md parsing (Prompt 5.6/7).
 */

import * as path from 'path';
import {
  getDefaultBigBandResearchPath,
  loadBigBandResearchFromPath,
  parseBigBandResearchMarkdown,
} from '../core/big-band/bigBandResearchParser';
import { BIG_BAND_RULE_REGISTRY } from '../core/big-band/bigBandRuleRegistry';

export function runBigBandResearchParsingTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const bundled = loadBigBandResearchFromPath(getDefaultBigBandResearchPath());
  out.push({
    ok: bundled.ok && bundled.stats.composerRuleLines >= 30 && bundled.stats.eraRuleLines >= 20,
    name: 'bundled BigBandResearch.md parses with expected rule counts',
  });

  const bad = parseBigBandResearchMarkdown('not a research file');
  out.push({
    ok: !bad.ok && bad.errors.length > 0,
    name: 'negative: invalid research structure handled safely',
  });

  const missing = loadBigBandResearchFromPath(path.join(__dirname, 'nonexistent-research-xyz.md'));
  out.push({
    ok: !missing.ok && missing.errors.some((e) => /failed to read/i.test(e)),
    name: 'negative: missing file returns parse failure',
  });

  const allRegistry = [
    ...BIG_BAND_RULE_REGISTRY.foundationalRules,
    ...Object.values(BIG_BAND_RULE_REGISTRY.composerRules).flat(),
    ...Object.values(BIG_BAND_RULE_REGISTRY.eraRules).flat(),
    ...BIG_BAND_RULE_REGISTRY.functionalRules.shout,
    ...BIG_BAND_RULE_REGISTRY.functionalRules.riff,
    ...BIG_BAND_RULE_REGISTRY.functionalRules.soli,
  ];
  out.push({
    ok: allRegistry.every((r) => r.priority >= 1 && r.priority <= 100),
    name: 'registry rules include priority in 1–100',
  });

  return out;
}
