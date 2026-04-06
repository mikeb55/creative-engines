/**
 * Form sweep — tests each formId with builtin harmony / fixed seed / mode (same stack as sweep.ts).
 * CLI: run from repo root via run-form-sweep.bat or:
 *   npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/scripts/form-sweep.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateComposition, type GenerateResult } from '../app-api/generateComposition';
import type { GenerateRequest } from '../app-api/appApiTypes';

const SEED = 283331063;
const MODE: 'stable' | 'balanced' | 'surprise' = 'stable';
const OUTPUT_DIR =
  'C:\\Users\\mike\\Documents\\Mike Composer Files\\Guitar-Bass Duos\\form-sweep\\';

/** Order and bar counts per task spec (15 forms). */
const FORM_MATRIX: { formId: string; totalBars: number }[] = [
  { formId: 'aaba', totalBars: 32 },
  { formId: 'abac', totalBars: 32 },
  { formId: 'aba', totalBars: 24 },
  { formId: 'ab', totalBars: 16 },
  { formId: 'blues12', totalBars: 12 },
  { formId: 'blues24', totalBars: 24 },
  { formId: 'through3', totalBars: 24 },
  { formId: 'through4', totalBars: 32 },
  { formId: 'through5', totalBars: 40 },
  { formId: 'through6', totalBars: 48 },
  { formId: 'through7', totalBars: 56 },
  { formId: 'through8', totalBars: 64 },
  { formId: 'aab', totalBars: 24 },
  { formId: 'abcb', totalBars: 32 },
  { formId: 'abacab', totalBars: 48 },
];

function formSweepValidationOk(r: GenerateResult): boolean {
  if (!r.success) return false;
  const v = r.validation;
  return (
    v.integrityPassed &&
    v.strictBarMathPassed &&
    v.exportRoundTripPassed &&
    v.exportIntegrityPassed &&
    v.mxValidationPassed
  );
}

function musicXmlHasRehearsal(filePath: string | undefined): boolean {
  if (!filePath || !fs.existsSync(filePath)) return false;
  const xml = fs.readFileSync(filePath, 'utf8');
  return xml.includes('<rehearsal');
}

function main(): void {
  const outputDir = path.resolve(OUTPUT_DIR);
  fs.mkdirSync(outputDir, { recursive: true });

  let passed = 0;
  let failed = 0;

  for (const { formId, totalBars } of FORM_MATRIX) {
    const req: GenerateRequest = {
      presetId: 'guitar_bass_duo',
      styleStack: {
        primary: 'barry_harris',
        styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
      },
      seed: SEED,
      harmonyMode: 'builtin',
      totalBars,
      longFormEnabled: totalBars > 8,
      creativeControlLevel: MODE,
      formId,
    };

    const r = generateComposition(req, outputDir);
    const ok = formSweepValidationOk(r);

    if (ok) {
      const hasReh = musicXmlHasRehearsal(r.filepath);
      passed++;
      const barCount =
        r.validation?.totalBars ??
        (r as GenerateResult & { receipt?: { bars?: number } }).receipt?.bars ??
        0;
      console.log(
        `PASS formId=${formId} bars=${totalBars} ` +
          `actual_bars=${barCount} ` +
          `rehearsal_marks=${hasReh ? 'yes' : 'no'}`
      );
    } else {
      failed++;
      const errs = r.validation.errors ?? [];
      const lines: string[] = [];
      for (const e of errs) {
        if (e && String(e).trim()) lines.push(String(e).trim());
      }
      if (lines.length === 0 && r.error) lines.push(r.error);
      if (lines.length === 0) lines.push('unknown (no validation.errors and no r.error)');
      console.log(`FAIL formId=${formId} bars=${totalBars}`);
      for (const line of lines) {
        console.log(`  - ${line}`);
      }
    }
  }

  console.log(`${passed} / ${FORM_MATRIX.length} forms passed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main();
