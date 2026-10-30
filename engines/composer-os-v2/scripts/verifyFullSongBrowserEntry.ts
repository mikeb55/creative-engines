/**
 * In-memory verify: generateFullSongMusicXml(seed, 32) — no disk writes.
 *
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/verifyFullSongBrowserEntry.ts
 */

import {
  apiCompareMusicalScores,
  apiEvaluateMusicalScore,
  generateFullSongMusicXml,
  packMelodicVariationsBrowser,
  packPassageReharmBrowser,
} from '../core/song-mode/fullSongBrowserApi';

const SEED = 334032;
const TOTAL_BARS = 32;

function countMeasures(xml: string): number {
  const partBlocks = xml.split(/<part\b/);
  let max = 0;
  for (const block of partBlocks.slice(1)) {
    const n = (block.match(/<measure\b/g) ?? []).length;
    if (n > max) max = n;
  }
  return max;
}

function main(): void {
  const xml = generateFullSongMusicXml(SEED, TOTAL_BARS, {
    title: 'Full Song Browser Entry (32 bars)',
  });
  const measures = countMeasures(xml);
  if (measures < TOTAL_BARS) {
    throw new Error(`measures ${measures} < ${TOTAL_BARS}`);
  }
  if (!xml.includes('<score-partwise') && !xml.includes('<score-timewise')) {
    throw new Error('invalid MusicXML root');
  }
  const pack = packMelodicVariationsBrowser({
    melody: [
      { pitch: 60, duration: 1 },
      { pitch: 62, duration: 1 },
      { pitch: 64, duration: 1 },
      { pitch: 65, duration: 1 },
    ],
    chords: ['C', 'G7', 'F', 'C'],
    variationCount: 3,
    songwriterId: 'beatles',
  });
  if (!pack.success || pack.variations.length < 1) {
    throw new Error(`packMelodicVariationsBrowser failed: ${!pack.success ? pack.error : 'no variations'}`);
  }

  const chords = Array.from({ length: 8 }, (_, i) => ['Cmaj7', 'Am7', 'Dm7', 'G7'][i % 4]!);
  const reharm = packPassageReharmBrowser({
    chords,
    startBar: 1,
    endBar: 4,
    songwriterId: 'beatles',
    seed: SEED,
    drift: 'neutral',
    melodyPcs: [0, 9, 2, 7],
  });
  if (!reharm.success || reharm.candidates.length < 1 || reharm.candidates.length > 3) {
    throw new Error(
      `packPassageReharmBrowser failed: ${!reharm.success ? reharm.error : `bad count ${reharm.success ? reharm.candidates.length : 0}`}`
    );
  }
  const scores = reharm.candidates.map((c) => c.gceScore);
  for (let i = 1; i < scores.length; i++) {
    if (scores[i]! > scores[i - 1]! + 1e-9) {
      throw new Error('packPassageReharmBrowser candidates not ranked by gceScore desc');
    }
  }

  const evaluated = apiEvaluateMusicalScore({ label: 'original', xml });
  if (!evaluated.ok) {
    throw new Error(`apiEvaluateMusicalScore failed: ${evaluated.error}`);
  }
  const revised = xml.replace(/<step>[A-G]<\/step>/, '<step>E</step>');
  const compared = apiCompareMusicalScores({
    scores: [
      { label: 'original', xml },
      { label: 'edited', xml: revised },
    ],
  });
  if (!compared.ok) {
    throw new Error(`apiCompareMusicalScores failed: ${compared.error}`);
  }
  if (compared.receipt.comparison?.rank != null) {
    throw new Error('comparison must leave rank null (human approval separate)');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        seed: SEED,
        totalBars: TOTAL_BARS,
        measures,
        bytes: xml.length,
        diskWrite: false,
        melodicVariations: pack.variations.length,
        topTransform: pack.variations[0]?.transform,
        reharmCandidates: reharm.candidates.length,
        topReharmLens: reharm.candidates[0]?.lensId,
        topReharmGce: reharm.candidates[0]?.gceScore,
        evaluateOk: evaluated.ok,
        compareDiffs: compared.receipt.comparison?.differences.length ?? 0,
        compareRank: compared.receipt.comparison?.rank ?? null,
      },
      null,
      2
    )
  );
}

main();
