/**
 * Dev 3 whole-song pilots. Read-only. Prints the region maps.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/pentatonicScorePilot.ts
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { analyzePentatonicScore, formatPentatonicScoreMap } from '../core/pentatonic/analyzeScore';

const album = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const files = [
  '07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml',
  '03-The-Mirror-Duo-Leadsheet-V1.0.musicxml',
  '05-Orbit-Duo-Leadsheet-V2.1.musicxml',
];

for (const file of files) {
  const full = `${album}/${file}`;
  const before = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  const xml = fs.readFileSync(full, 'utf8');
  const analysis = analyzePentatonicScore(xml, { profile: 'wwh-duo-1.1', sourceFile: file, sourceSha256: before });
  const after = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  console.log(`SHA BEFORE ${before}`);
  console.log(`SHA AFTER ${after}`);
  console.log(formatPentatonicScoreMap(analysis));
  console.log('\n----\n');
}
