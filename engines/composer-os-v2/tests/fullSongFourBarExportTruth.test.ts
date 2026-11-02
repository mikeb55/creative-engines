/**
 * Regression: Beatles/Dreamy(neutral)/4 bars/seed 334032 must export exactly 4 measures
 * (chord plan must honour totalBars — no phantom pool-row inflation).
 *
 * Run: npx tsx --tsconfig ../../tsconfig.json tests/fullSongFourBarExportTruth.test.ts
 */
import assert from 'node:assert/strict';
import { generateFullSongMusicXml } from '../core/song-mode/generateFullSongMusicXml';

function measureCountPerPart(xml: string): number[] {
  const parts = xml.match(/<part\b[^>]*>[\s\S]*?<\/part>/g) ?? [];
  return parts.map((part) => (part.match(/<measure\b/g) ?? []).length);
}

function main(): void {
  const xml = generateFullSongMusicXml(334032, 4, {
    title: 'Full Song · Beatles · 4 bars',
    primarySongwriterStyle: 'beatles',
    mood: 'neutral',
    bpm: 120,
  });

  assert.match(xml, /<score-partwise|<score-timewise/);
  const counts = measureCountPerPart(xml);
  assert.ok(counts.length >= 1, 'expected at least one part');
  for (const n of counts) {
    assert.equal(n, 4, `each part must have exactly 4 measures (got ${JSON.stringify(counts)})`);
  }

  console.log(
    `fullSongFourBarExportTruth PASS parts=${counts.length} measures=${counts.join(',')}`
  );
}

main();
