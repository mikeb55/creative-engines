/**
 * Writes two big-band MusicXML files (same seed): Wyble map ON vs suppressed OFF.
 * Run from `engines/composer-os-v2`:
 *   npx ts-node --transpile-only --project ../../tsconfig.json scripts/bigBandWybleOnOffExport.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';

const SEED = 12345;
const OUT_DIR = 'C:\\Users\\mike\\Documents\\Mike Composer Files\\wyble-test';
const FILE_ON = path.join(OUT_DIR, 'bb_wyble_ON_seed12345.musicxml');
const FILE_OFF = path.join(OUT_DIR, 'bb_wyble_OFF_seed12345.musicxml');

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const base = { seed: SEED, totalBars: 16, era: 'swing' as const, title: `Big band Wyble compare ${SEED}` };
  const on = runBigBandRealisation(base);
  const off = runBigBandRealisation({ ...base, suppressWybleVoiceLayoutForTest: true });

  if (!on.exportPipeline.ok || !on.exportPipeline.xml) {
    console.error('[bigBandWybleOnOffExport] ON run failed:', on.exportPipeline.errors);
    process.exit(1);
  }
  if (!off.exportPipeline.ok || !off.exportPipeline.xml) {
    console.error('[bigBandWybleOnOffExport] OFF run failed:', off.exportPipeline.errors);
    process.exit(1);
  }

  const parts = on.score?.parts.map((p) => ({ id: p.id, name: p.name })) ?? [];
  console.log('[bigBandWybleOnOffExport] ON part ids:', JSON.stringify(parts));

  fs.writeFileSync(FILE_ON, on.exportPipeline.xml, 'utf-8');
  fs.writeFileSync(FILE_OFF, off.exportPipeline.xml, 'utf-8');
  console.log(`[bigBandWybleOnOffExport] wrote ${FILE_ON} (${on.exportPipeline.xml.length} chars)`);
  console.log(`[bigBandWybleOnOffExport] wrote ${FILE_OFF} (${off.exportPipeline.xml.length} chars)`);
}

main();
