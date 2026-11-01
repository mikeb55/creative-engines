/**
 * Regression: Beatles/Dreamy(neutral)/8 bars/seed 334032 must export exactly 8 measures
 * with plan-consistent rehearsal marks (not hardcoded duo A/B-only).
 *
 * Run: npx tsx --tsconfig ../../tsconfig.json tests/fullSongEightBarExportTruth.test.ts
 */
import assert from 'node:assert/strict';
import { generateFullSongMusicXml } from '../core/song-mode/generateFullSongMusicXml';

function measureCountPerPart(xml: string): number[] {
  const parts = xml.match(/<part\b[^>]*>[\s\S]*?<\/part>/g) ?? [];
  return parts.map((part) => (part.match(/<measure\b/g) ?? []).length);
}

function main(): void {
  const xml = generateFullSongMusicXml(334032, 8, {
    title: 'Full Song · Beatles · 8 bars',
    primarySongwriterStyle: 'beatles',
    mood: 'neutral',
    bpm: 120,
  });

  assert.match(xml, /<score-partwise|<score-timewise/);
  const counts = measureCountPerPart(xml);
  assert.ok(counts.length >= 1, 'expected at least one part');
  for (const n of counts) {
    assert.equal(n, 8, `each part must have exactly 8 measures (got ${JSON.stringify(counts)})`);
  }

  const firstPart = (xml.match(/<part\b[^>]*>[\s\S]*?<\/part>/) ?? [])[0] ?? '';
  const bar1 = firstPart.match(/<measure[^>]*number="1"[\s\S]*?<\/measure>/);
  assert.ok(bar1, 'missing measure 1');
  const rh = bar1![0].match(/<rehearsal[^>]*>([^<]*)<\/rehearsal>/);
  assert.ok(rh, 'bar 1 must carry a rehearsal mark');
  assert.notEqual(rh![1].trim(), 'A', '8-bar mosaic must not be forced to duo letter A');
  assert.match(rh![1], /Beatles/i);

  console.log(
    `fullSongEightBarExportTruth PASS parts=${counts.length} measures=${counts.join(',')} bar1Rehearsal=${JSON.stringify(rh![1].trim())}`
  );
}

main();
