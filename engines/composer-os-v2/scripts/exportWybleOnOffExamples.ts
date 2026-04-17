/**
 * Developer-facing Wyble ON/OFF MusicXML export (string quartet + big band).
 * Uses real generators: runQuartetRealisation / runBigBandRealisation.
 * ON = default orchestration wybleVoiceLayout; OFF = suppressWybleVoiceLayoutForTest.
 *
 * From engines/composer-os-v2:
 *   npm run export:wyble-examples
 *   npx ts-node --transpile-only --project ../../tsconfig.json scripts/exportWybleOnOffExamples.ts
 *   ... --family quartet|bigband|all --seed 12345 --out "C:\\path\\wyble-test"
 */

import * as fs from 'fs';
import * as path from 'path';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';

export const DEFAULT_WYBLE_EXPORT_DIR =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\wyble-test';

export type WybleExportFamily = 'quartet' | 'bigband' | 'all';

export interface ExportWybleOnOffParams {
  seed: number;
  family: WybleExportFamily;
  /** Output directory (created if missing). */
  outDir: string;
}

export interface ExportWybleOnOffResult {
  written: string[];
  errors: string[];
}

export function exportWybleOnOffExamples(params: ExportWybleOnOffParams): ExportWybleOnOffResult {
  const { seed, family, outDir } = params;
  fs.mkdirSync(outDir, { recursive: true });
  const written: string[] = [];
  const errors: string[] = [];

  const writePair = (
    label: string,
    prefix: 'quartet' | 'bigband',
    onXml: string | undefined,
    offXml: string | undefined,
    onOk: boolean,
    offOk: boolean,
    onPipeErrs: string[],
    offPipeErrs: string[]
  ): void => {
    const onPath = path.join(outDir, `${prefix}_wyble_ON_seed${seed}.musicxml`);
    const offPath = path.join(outDir, `${prefix}_wyble_OFF_seed${seed}.musicxml`);
    if (!onOk || !onXml) {
      errors.push(`${label} ON failed: ${onPipeErrs.join('; ') || 'no xml'}`);
      return;
    }
    if (!offOk || !offXml) {
      errors.push(`${label} OFF failed: ${offPipeErrs.join('; ') || 'no xml'}`);
      return;
    }
    fs.writeFileSync(onPath, onXml, 'utf-8');
    fs.writeFileSync(offPath, offXml, 'utf-8');
    written.push(onPath, offPath);
  };

  if (family === 'quartet' || family === 'all') {
    const base = { seed, totalBars: 16, title: `Quartet Wyble export ${seed}` };
    const on = runQuartetRealisation(base);
    const off = runQuartetRealisation({ ...base, suppressWybleVoiceLayoutForTest: true });
    writePair(
      'String quartet',
      'quartet',
      on.exportPipeline.xml,
      off.exportPipeline.xml,
      !!on.exportPipeline.ok,
      !!off.exportPipeline.ok,
      on.exportPipeline.errors ?? [],
      off.exportPipeline.errors ?? []
    );
  }

  if (family === 'bigband' || family === 'all') {
    const base = { seed, totalBars: 16, era: 'swing' as const, title: `Big band Wyble export ${seed}` };
    const on = runBigBandRealisation(base);
    const off = runBigBandRealisation({ ...base, suppressWybleVoiceLayoutForTest: true });
    writePair(
      'Big band',
      'bigband',
      on.exportPipeline.xml,
      off.exportPipeline.xml,
      !!on.exportPipeline.ok,
      !!off.exportPipeline.ok,
      on.exportPipeline.errors ?? [],
      off.exportPipeline.errors ?? []
    );
  }

  return { written, errors };
}

function parseCli(): { seed: number; family: WybleExportFamily; outDir: string } {
  const argv = process.argv.slice(2);
  let seed = 12345;
  let family: WybleExportFamily = 'all';
  let outDir = DEFAULT_WYBLE_EXPORT_DIR;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seed' && argv[i + 1]) {
      seed = parseInt(argv[i + 1]!, 10);
      if (!Number.isFinite(seed)) seed = 12345;
      i++;
      continue;
    }
    if (a === '--family' && argv[i + 1]) {
      const v = argv[i + 1]!;
      if (v === 'quartet' || v === 'bigband' || v === 'all') family = v;
      i++;
      continue;
    }
    if (a === '--out' && argv[i + 1]) {
      outDir = argv[i + 1]!;
      i++;
    }
  }
  return { seed, family, outDir };
}

function main(): void {
  const { seed, family, outDir } = parseCli();
  const { written, errors } = exportWybleOnOffExamples({ seed, family, outDir });

  if (errors.length) {
    console.error('[exportWybleOnOffExamples]', errors.join('\n'));
    process.exit(1);
  }

  console.log('[exportWybleOnOffExamples] seed=%s family=%s outDir=%s', seed, family, outDir);
  console.log('[exportWybleOnOffExamples] wrote %s file(s):', written.length);
  for (const p of written) console.log('  ', p);
}

/** Run CLI only when executed directly (not when imported by Jest). */
declare const require: NodeRequire;
declare const module: NodeModule;
const runAsCli = typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module;
if (runAsCli) {
  main();
}
