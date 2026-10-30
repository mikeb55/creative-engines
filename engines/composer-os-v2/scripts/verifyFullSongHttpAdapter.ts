/**
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/verifyFullSongHttpAdapter.ts
 */

import path from 'path';
import { apiGenerateFullSong } from '../app-api/fullSongHttpAdapter';

const out = path.join(__dirname, '..', '..', '..', '.tmp-full-song-proof');
const r = apiGenerateFullSong({ seed: 334032, totalBars: 32 }, out);
if (!r.success) {
  console.error(JSON.stringify(r));
  process.exit(1);
}
const xml = r.musicXml;
const partMeasures = Math.max(
  0,
  ...xml
    .split(/<part\b/)
    .slice(1)
    .map((b) => (b.match(/<measure\b/g) || []).length)
);
const ok = xml.includes('<score-partwise') && partMeasures >= 32;
console.log(
  JSON.stringify(
    {
      ok,
      seed: r.seed,
      totalBars: r.totalBars,
      partMeasures,
      bytes: xml.length,
      filepath: r.filepath,
      interface:
        'POST /api/full-song  JSON {seed,totalBars?} → {success,musicXml,seed,totalBars} | Accept application/xml → raw MusicXML',
    },
    null,
    2
  )
);
if (!ok) process.exit(1);
