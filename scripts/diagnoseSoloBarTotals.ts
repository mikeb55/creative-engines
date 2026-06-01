/**
 * Diagnose MusicXML bar duration totals (dynamic divisions carry-forward).
 * Run: npx tsx --tsconfig tsconfig.json scripts/diagnoseSoloBarTotals.ts [dir]
 */

import fs from 'node:fs';
import path from 'node:path';
import { findBarTotalIssues } from '../engines/composer-os-v2/core/solo/soloMusicalityXml';

const OUT =
  process.argv[2] ??
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-Solos';

const FILES = [
  'solo_01_tritonic.musicxml',
  'solo_02_vault_triad_pairs.musicxml',
  'solo_03_martino_linear.musicxml',
  'solo_04_zappa.musicxml',
];

let totalBad = 0;

for (const filename of FILES) {
  const xml = fs.readFileSync(path.join(OUT, filename), 'utf-8');
  const divTags = (xml.match(/<divisions>/g) ?? []).length;
  const uniqueDivs = [
    ...new Set(
      [...xml.matchAll(/<divisions>(\d+)<\/divisions>/g)].map((m) => parseInt(m[1]!, 10)),
    ),
  ];
  const issues = findBarTotalIssues(xml, filename);
  console.log(`\n=== ${filename} ===`);
  console.log(`<divisions> tags: ${divTags} | unique values: ${uniqueDivs.join(', ') || '(none)'}`);
  console.log(`Invalid bars: ${issues.length}`);
  for (const b of issues) {
    console.log(
      `${filename} | bar ${b.barNum} | divisions ${b.divisions} | expected ${b.expected} | actual ${b.actual} | FAIL`,
    );
    totalBad += 1;
  }
  if (issues.length === 0) console.log('All bars PASS');
}

console.log(`\nTOTAL INVALID BARS: ${totalBad} / 112`);
if (totalBad > 0) process.exit(1);
