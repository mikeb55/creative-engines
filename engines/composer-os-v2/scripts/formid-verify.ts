import * as fs from 'fs';
import { generateComposition } from '../app-api/generateComposition';

const OUT = 'C:\\Users\\mike\\Documents\\Mike Composer Files\\Guitar-Bass Duos\\verify\\';
fs.mkdirSync(OUT, { recursive: true });

const BASE = {
  presetId: 'guitar_bass_duo' as const,
  styleStack: {
    primary: 'barry_harris' as const,
    styleBlend: { primary: 'strong' as const, secondary: 'off' as const, colour: 'off' as const },
  },
  seed: 283331063,
  harmonyMode: 'builtin' as const,
  creativeControlLevel: 'stable' as const,
};

function barCount(filepath: string): number {
  const xml = fs.readFileSync(filepath, 'utf8');
  const matches = xml.match(/<measure number="\d+"/g) ?? [];
  return matches.length / 2;
}

function rehearsalMarks(filepath: string): string[] {
  const xml = fs.readFileSync(filepath, 'utf8');
  const matches = [...xml.matchAll(/<rehearsal[^>]*>([^<]*)<\/rehearsal>/g)];
  const seen = new Set<string>();
  return matches
    .map((m) => m[1].replace(/&apos;/g, "'"))
    .filter((m) => {
      if (seen.has(m)) return false;
      seen.add(m);
      return true;
    });
}

let pass = 0;
let fail = 0;

function check(label: string, got: unknown, expected: unknown): void {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log(`  PASS ${label}`);
  } else {
    fail++;
    console.log(`  FAIL ${label}: got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
  }
}

// TEST 1: through-composed 4 — must show A,B,C,D marks not A,A',B,A''
console.log('TEST 1: through4 formId → ABCD rehearsal marks');
const r1 = generateComposition({ ...BASE, totalBars: 32, longFormEnabled: true, formId: 'through4' } as any, OUT);
if (r1.success && r1.filepath) {
  check('bar count = 32', barCount(r1.filepath), 32);
  check('rehearsal marks = A,B,C,D', rehearsalMarks(r1.filepath), ['A', 'B', 'C', 'D']);
} else {
  fail++;
  console.log(`  FAIL generation: ${r1.error ?? 'unknown'}`);
}

// TEST 2: through-composed 5 — must produce 40 bars
console.log('TEST 2: through5 formId → 40 bars');
const r2 = generateComposition({ ...BASE, totalBars: 40, longFormEnabled: true, formId: 'through5' } as any, OUT);
if (r2.success && r2.filepath) {
  check('bar count = 40', barCount(r2.filepath), 40);
  check('rehearsal marks = A,B,C,D,E', rehearsalMarks(r2.filepath), ['A', 'B', 'C', 'D', 'E']);
} else {
  fail++;
  console.log(`  FAIL generation: ${r2.error ?? 'unknown'}`);
}

// TEST 3: aaba — must show A,A',B,A'' marks (regression check)
console.log('TEST 3: aaba formId → A,A prime,B,A double-prime rehearsal marks');
const r3 = generateComposition({ ...BASE, totalBars: 32, longFormEnabled: true, formId: 'aaba' } as any, OUT);
if (r3.success && r3.filepath) {
  check("rehearsal marks = A,A',B,A''", rehearsalMarks(r3.filepath), ['A', "A'", 'B', "A''"]);
} else {
  fail++;
  console.log(`  FAIL generation: ${r3.error ?? 'unknown'}`);
}

console.log(`\n${pass} / ${pass + fail} checks passed`);
if (fail > 0) process.exit(1);
