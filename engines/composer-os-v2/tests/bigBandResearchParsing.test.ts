/**
 * BigBandResearch.md parsing (Prompt 5.6/7).
 */

import * as path from 'path';
import {
  getDefaultBigBandResearchPath,
  loadBigBandResearchFromPath,
  parseBigBandResearchMarkdown,
} from '../core/big-band/bigBandResearchParser';

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

  return out;
}
