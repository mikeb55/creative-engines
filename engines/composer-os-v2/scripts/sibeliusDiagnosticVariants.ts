/**
 * One-shot: same duo score (fixed seed) → three MusicXML files for Sibelius A/B/C comparison.
 * Run: npx ts-node --project ../../tsconfig.json scripts/sibeliusDiagnosticVariants.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';

const SEED = 42;
const OUT_DIR = path.join(__dirname, '..', 'diagnostics', 'sibelius');

function main(): void {
  const r = runGoldenPath(SEED);
  if (!r.success || !r.score) {
    console.error('Golden path failed:', r.errors);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const base = `duo-seed${SEED}`;

  const a = exportScoreModelToMusicXml(r.score, { bassStaffVoice1Only: true });
  const b = exportScoreModelToMusicXml(r.score, { omitChordSymbols: true });
  const c = exportScoreModelToMusicXml(r.score, { minimizeNoteFragmentation: true });

  const writes: { label: string; result: ReturnType<typeof exportScoreModelToMusicXml> }[] = [
    { label: 'A-bass-voice1-only', result: a },
    { label: 'B-no-harmony', result: b },
    { label: 'C-min-note-fragments', result: c },
  ];

  for (const { label, result } of writes) {
    if (!result.success || !result.xml) {
      console.error(`Variant ${label} failed:`, result.errors);
      process.exit(1);
    }
    const fp = path.join(OUT_DIR, `${base}-${label}.musicxml`);
    fs.writeFileSync(fp, result.xml, 'utf8');
    console.log('Wrote', fp);
  }

  console.log('\nImport each file into Sibelius and note which fixes bar/rhythm display.');
  console.log('A = bass staff voice 1 only | B = no chord symbols | C = minimal tied fragmentation (DP)');
}

main();
