/**
 * Prompt 6.5/7 — Songwriting.md parsing
 */

import * as path from 'path';
import {
  getDefaultSongwritingResearchPath,
  loadSongwritingResearchFromPath,
  parseSongwritingResearchMarkdown,
} from '../core/song-mode/songwritingResearchParser';

export function runSongwritingResearchParsingTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const bundled = loadSongwritingResearchFromPath(getDefaultSongwritingResearchPath());
  out.push({
    ok:
      bundled.ok &&
      bundled.stats.songwriterRuleLines >= 80 &&
      bundled.stats.hooksAndStructureLines >= 8 &&
      (bundled.songwriters.bacharach?.engineRuleLines.length ?? 0) > 0 &&
      (bundled.songwriters.max_martin?.engineRuleLines.length ?? 0) > 0,
    name: 'bundled Songwriting.md parses with expected rule counts',
  });

  const bad = parseSongwritingResearchMarkdown('## SECTION 1\n');
  out.push({
    ok: !bad.ok && bad.errors.length > 0,
    name: 'negative: invalid research structure handled safely',
  });

  const missing = loadSongwritingResearchFromPath(path.join(__dirname, 'nonexistent_songwriting_xyz.md'));
  out.push({
    ok: !missing.ok && missing.errors.some((e) => e.toLowerCase().includes('failed to read')),
    name: 'negative: missing file returns parse failure',
  });

  return out;
}
