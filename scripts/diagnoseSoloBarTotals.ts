/**
 * Diagnose MusicXML bar duration totals.
 * Run: npx tsx --tsconfig tsconfig.json scripts/diagnoseSoloBarTotals.ts [dir]
 */

import fs from 'node:fs';
import path from 'node:path';

const OUT =
  process.argv[2] ??
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Orbit Big Band\\Orbit-Solos';

const FILES = [
  'solo_01_tritonic.musicxml',
  'solo_02_vault_triad_pairs.musicxml',
  'solo_03_martino_linear.musicxml',
  'solo_04_zappa.musicxml',
];

type BadBar = {
  barNum: number;
  expected: number;
  actual: number;
  diff: number;
  divisions: number;
};

function diagnoseFile(filename: string): { filename: string; totalBars: number; bad: BadBar[] } {
  const xml = fs.readFileSync(path.join(OUT, filename), 'utf-8');
  const part = xml.match(/<part id="[^"]+"[\s\S]*?<\/part>/)?.[0] ?? xml;
  const measures = [...part.matchAll(/<measure[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g)];
  const bad: BadBar[] = [];

  for (const m of measures) {
    const barNum = parseInt(m[1]!, 10);
    const body = m[2]!;
    const divisions = parseInt(body.match(/<divisions>(\d+)<\/divisions>/)?.[1] ?? '480', 10);
    const beats = parseInt(body.match(/<beats>(\d+)<\/beats>/)?.[1] ?? '4', 10);
    const beatType = parseInt(body.match(/<beat-type>(\d+)<\/beat-type>/)?.[1] ?? '4', 10);
    const expected = (divisions * beats * 4) / beatType;

    let pos = 0;
    for (const nb of body.matchAll(/<note>([\s\S]*?)<\/note>/g)) {
      const block = nb[1]!;
      if (/<chord\s*\/>/.test(block)) continue;
      const dur = parseInt(block.match(/<duration>(\d+)<\/duration>/)?.[1] ?? '0', 10);
      pos += dur;
    }

    if (Math.abs(pos - expected) > 0.01) {
      bad.push({ barNum, expected, actual: pos, diff: pos - expected, divisions });
    }
  }

  return { filename, totalBars: measures.length, bad };
}

const results = FILES.map(diagnoseFile);
let totalBad = 0;

for (const r of results) {
  console.log(`\n=== ${r.filename} (${r.totalBars} bars) ===`);
  console.log(`Invalid bars: ${r.bad.length}`);
  for (const b of r.bad) {
    console.log(`${r.filename} | bar ${b.barNum} | expected ${b.expected} | actual ${b.actual} | diff ${b.diff}`);
    totalBad += 1;
  }
}

console.log(`\nTOTAL INVALID BARS: ${totalBad} / 112`);
if (totalBad > 0) process.exit(1);
