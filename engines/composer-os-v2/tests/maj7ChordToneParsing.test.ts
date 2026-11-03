/**
 * Regression: maj7 must not match /m7/ inside "maj7" (minor third false positive).
 *
 * Run:
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/maj7ChordToneParsing.test.ts
 */

import { chordTonesForChordSymbol } from '../core/harmony/chordSymbolAnalysis';

function pcs(sym: string): number[] {
  const t = chordTonesForChordSymbol(sym, { lockedHarmony: true });
  return [t.root, t.third, t.fifth, t.seventh].map((x) => (((Math.round(x) % 12) + 12) % 12));
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const rows: { name: string; ok: boolean; detail: string }[] = [];

{
  const got = pcs('Cmaj7');
  const expect = [0, 4, 7, 11]; // C E G B
  const ok = got.join(',') === expect.join(',');
  rows.push({
    name: 'Cmaj7 PCs = C E G B (not Eb)',
    ok,
    detail: `got=[${got.join(',')}] expect=[${expect.join(',')}]`,
  });
}

{
  const got = pcs('Cm7');
  const expect = [0, 3, 7, 10]; // C Eb G Bb
  const ok = got.join(',') === expect.join(',');
  rows.push({
    name: 'Cm7 PCs = C Eb G Bb (genuine minor-7)',
    ok,
    detail: `got=[${got.join(',')}] expect=[${expect.join(',')}]`,
  });
}

{
  const got = pcs('Dm7');
  const expect = [2, 5, 9, 0]; // D F A C
  const ok = got.join(',') === expect.join(',');
  rows.push({
    name: 'Dm7 PCs = D F A C',
    ok,
    detail: `got=[${got.join(',')}] expect=[${expect.join(',')}]`,
  });
}

{
  const got = pcs('G7/B');
  const expect = [7, 11, 2, 5]; // G B D F (slash ignored for upper tones)
  const ok = got.join(',') === expect.join(',');
  rows.push({
    name: 'G7/B PCs = G B D F',
    ok,
    detail: `got=[${got.join(',')}] expect=[${expect.join(',')}]`,
  });
}

let failed = 0;
for (const r of rows) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name} — ${r.detail}`);
  if (!r.ok) failed += 1;
}
assert(failed === 0, `${failed} maj7 chord-tone parsing regression(s) failed`);
console.log(`OK ${rows.length}/${rows.length}`);
