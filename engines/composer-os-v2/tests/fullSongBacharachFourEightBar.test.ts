/**
 * Focused regression: Bacharach / Dreamy(neutral) / 100 BPM / seed 334032
 * must pass golden path at 4 bars and 8 bars without short-form false fails.
 *
 * Run: npx tsx --tsconfig ../../tsconfig.json tests/fullSongBacharachFourEightBar.test.ts
 */
import assert from 'node:assert/strict';
import { generateFullSongMusicXml } from '../core/song-mode/generateFullSongMusicXml';

function measureCountPerPart(xml: string): number[] {
  const parts = xml.match(/<part\b[^>]*>[\s\S]*?<\/part>/g) ?? [];
  return parts.map((part) => (part.match(/<measure\b/g) ?? []).length);
}

function generateBacharach(bars: number): string {
  return generateFullSongMusicXml(334032, bars, {
    title: `Full Song · Burt Bacharach · ${bars} bars`,
    primarySongwriterStyle: 'bacharach',
    mood: 'neutral',
    bpm: 100,
  });
}

function main(): void {
  const xml4 = generateBacharach(4);
  assert.match(xml4, /<score-partwise|<score-timewise/);
  const counts4 = measureCountPerPart(xml4);
  assert.ok(counts4.length >= 1, '4-bar: expected parts');
  for (const n of counts4) {
    assert.equal(n, 4, `4-bar: each part must have 4 measures (got ${JSON.stringify(counts4)})`);
  }

  const xml8 = generateBacharach(8);
  assert.match(xml8, /<score-partwise|<score-timewise/);
  const counts8 = measureCountPerPart(xml8);
  assert.ok(counts8.length >= 1, '8-bar: expected parts');
  for (const n of counts8) {
    assert.equal(n, 8, `8-bar: each part must have 8 measures (got ${JSON.stringify(counts8)})`);
  }

  console.log(
    `fullSongBacharachFourEightBar PASS 4=${counts4.join(',')} 8=${counts8.join(',')}`
  );
}

main();
