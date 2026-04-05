/**
 * CLI sweep harness — calls the same app API entry as the desktop Generate button
 * (`generateComposition` → `runGoldenPath` → `generateGoldenPathDuoScore` + export).
 * No Electron / UI.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateComposition, type GenerateResult } from '../app-api/generateComposition';
import type { GenerateRequest } from '../app-api/appApiTypes';

function parseArgs(argv: string[]): {
  seeds: number[];
  progression: string;
  mode: 'stable' | 'balanced' | 'surprise';
  out: string;
} {
  const out: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seeds' || a === '--progression' || a === '--mode' || a === '--out') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) {
        throw new Error(`Missing value for ${a}`);
      }
      out[a.slice(2)] = v;
      i++;
    }
  }
  const seedsRaw = out.seeds;
  const progression = out.progression;
  const mode = out.mode;
  const outDir = out.out;
  if (!seedsRaw || !progression || !mode || !outDir) {
    throw new Error(
      'Usage: sweep --seeds 1,2,3 --progression "Dm9|Bbmaj7|..." --mode stable|balanced|surprise --out <folder>'
    );
  }
  if (mode !== 'stable' && mode !== 'balanced' && mode !== 'surprise') {
    throw new Error(`Invalid --mode: ${mode}`);
  }
  const seeds = seedsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = Number(s);
      if (!Number.isFinite(n)) throw new Error(`Invalid seed: ${s}`);
      return Math.floor(n);
    });
  if (seeds.length === 0) throw new Error('No seeds in --seeds');
  return { seeds, progression, mode, out: outDir };
}

function barCountFromProgression(progression: string): number {
  return progression
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean).length;
}

function desktopValidationOk(r: GenerateResult): boolean {
  if (!r.success) return false;
  const v = r.validation;
  return (
    v.integrityPassed &&
    v.behaviourGatesPassed &&
    v.mxValidationPassed &&
    v.strictBarMathPassed &&
    v.exportRoundTripPassed &&
    v.exportIntegrityPassed &&
    v.instrumentMetadataPassed
  );
}

function main(): void {
  const { seeds, progression, mode, out } = parseArgs(process.argv);
  const totalBars = barCountFromProgression(progression);
  if (![8, 16, 32].includes(totalBars)) {
    throw new Error(
      `Chord progression must expand to 8, 16, or 32 bars (got ${totalBars} segments). Check | separators.`
    );
  }

  const outputDir = path.resolve(out);
  fs.mkdirSync(outputDir, { recursive: true });

  let failed = 0;
  let passed = 0;

  for (const seed of seeds) {
    const req: GenerateRequest = {
      presetId: 'guitar_bass_duo',
      styleStack: {
        primary: 'barry_harris',
        styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
      },
      seed,
      harmonyMode: 'custom_locked',
      chordProgressionText: progression,
      totalBars,
      longFormEnabled: totalBars === 16 || totalBars === 32 ? true : false,
      creativeControlLevel: mode,
    };

    const r = generateComposition(req, outputDir);
    const ok = desktopValidationOk(r);
    const label = r.filename ?? r.filepath ?? '(no file)';
    if (ok) {
      passed++;
      console.log(`PASS seed=${seed} mode=${mode} file=${label}`);
    } else {
      failed++;
      const errs = r.validation.errors ?? [];
      const lines: string[] = [];
      for (const e of errs) {
        if (e && String(e).trim()) lines.push(String(e).trim());
      }
      if (lines.length === 0 && r.error) lines.push(r.error);
      if (lines.length === 0) lines.push('unknown (no validation.errors and no r.error)');
      console.log(`FAIL seed=${seed} mode=${mode}`);
      for (const line of lines) {
        console.log(`  - ${line}`);
      }
    }
  }

  console.log(`${passed} / ${seeds.length} passed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main();
