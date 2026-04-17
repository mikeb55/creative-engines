/**
 * Writes two string-quartet MusicXML files (same seed): Wyble map ON vs suppressed OFF.
 * Run from `engines/composer-os-v2`:
 *   npx ts-node --transpile-only --project ../../tsconfig.json scripts/quartetWybleOnOffExport.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';

const SEED = 12345;
const OUT_DIR = 'C:\\Users\\mike\\Documents\\Mike Composer Files\\wyble-test';
const FILE_ON = path.join(OUT_DIR, 'quartet_wyble_ON_seed12345.musicxml');
const FILE_OFF = path.join(OUT_DIR, 'quartet_wyble_OFF_seed12345.musicxml');

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const base = { seed: SEED, totalBars: 16, title: `Quartet Wyble compare ${SEED}` };
  const on = runQuartetRealisation(base);
  const off = runQuartetRealisation({ ...base, suppressWybleVoiceLayoutForTest: true });

  if (!on.exportPipeline.ok || !on.exportPipeline.xml) {
    console.error('[quartetWybleOnOffExport] ON run failed:', on.exportPipeline.errors);
    process.exit(1);
  }
  if (!off.exportPipeline.ok || !off.exportPipeline.xml) {
    console.error('[quartetWybleOnOffExport] OFF run failed:', off.exportPipeline.errors);
    process.exit(1);
  }

  const parts = on.score?.parts.map((p) => ({ id: p.id, name: p.name })) ?? [];
  console.log('[quartetWybleOnOffExport] ON part ids:', JSON.stringify(parts));

  fs.writeFileSync(FILE_ON, on.exportPipeline.xml, 'utf-8');
  fs.writeFileSync(FILE_OFF, off.exportPipeline.xml, 'utf-8');
  console.log(`[quartetWybleOnOffExport] wrote ${FILE_ON} (${on.exportPipeline.xml.length} chars)`);
  console.log(`[quartetWybleOnOffExport] wrote ${FILE_OFF} (${off.exportPipeline.xml.length} chars)`);
}

main();
