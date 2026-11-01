/**
 * Contrasting reharm: same seed deterministic; different seeds can diverge when near-best band > 1.
 * Run: npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/tests/reharmContrastingSeedVariety.test.ts
 */

import { buildReharmPostGenPreviewContext } from '../core/harmony/buildReharmPostGenPreviewContext';
import { generateContrastingReharmSequences } from '../core/harmony/reharmSequenceRanker';
import type { AlternativeProgression } from '../core/harmony/reharmSequenceTypes';
import { REHARM_APPROACHES } from '../core/harmony/reharmCandidateEngine';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function fingerprint(alts: AlternativeProgression[]): string {
  return JSON.stringify(
    alts.map((a) => ({
      approach: a.approach,
      bars: a.bars.map((b) => `${b.substituteRootPc}:${b.substituteChordTypeId}`),
    }))
  );
}

const results: Array<{ name: string; ok: boolean }> = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (e) {
    results.push({ name, ok: false });
    console.error(`FAIL ${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

const BARS = ['F', 'Fm', 'C', 'Cm', 'C', 'Db7', 'C', 'Bb'];
const ctx = buildReharmPostGenPreviewContext(334032, BARS, { songwriterStyleId: 'beatles' });

function runContrasting(seed: number) {
  return generateContrastingReharmSequences({
    context: ctx,
    startBar: 1,
    endBar: 4,
    lensIds: ['beatles'],
    drift: 'neutral',
    seed,
    selectionMode: 'contrasting',
    melodyPcs: [5, 5, 0, 0],
  });
}

test('same seed → identical contrasting sequences (deterministic)', () => {
  const a = runContrasting(334032);
  const b = runContrasting(334032);
  assert(a.alternatives.length === b.alternatives.length, 'len');
  assert(fingerprint(a.alternatives) === fingerprint(b.alternatives), 'fingerprint mismatch');
});

test('preserves up to three distinct approaches when available', () => {
  const { alternatives } = runContrasting(334032);
  assert(alternatives.length >= 1, 'need ≥1');
  const approaches = alternatives.map((a) => a.approach);
  const unique = new Set(approaches);
  assert(unique.size === approaches.length, 'duplicate approaches');
  for (const ap of approaches) {
    assert(!!ap && (REHARM_APPROACHES as readonly string[]).includes(ap), `unknown ${ap}`);
  }
});

test('different seeds can yield different sequences when near-best band allows', () => {
  // Known UI pair that previously collided under tie-only seeding.
  const uiA = fingerprint(runContrasting(334032).alternatives);
  const uiB = fingerprint(runContrasting(1256437090).alternatives);
  const seeds = [334032, 1256437090, 42, 99_001, 7, 888_888, 1_234_567];
  const fps = seeds.map((s) => fingerprint(runContrasting(s).alternatives));
  const unique = new Set(fps);
  assert(uiA !== uiB || unique.size >= 2, 'expected seed diversity on UI pair or seed set');
  if (unique.size >= 2) return;
  const first = runContrasting(seeds[0]!);
  assert(
    first.alternatives.length < 3,
    `no sequence diversity across ${seeds.length} seeds despite ${first.alternatives.length} alts — near-best band likely inert`
  );
});

test('seeded regeneration still returns musically gated packs (no empty junk)', () => {
  for (const seed of [334032, 1256437090]) {
    const { alternatives, shortfall } = runContrasting(seed);
    assert(alternatives.length >= 1, `seed ${seed} empty`);
    for (const alt of alternatives) {
      assert(alt.bars.length === 4, `bars ${alt.approach}`);
      for (const bar of alt.bars) {
        assert(!bar.mappingNull, 'mappingNull');
        assert(bar.substituteChordTypeId.length > 0, 'empty type');
      }
    }
    if (alternatives.length < 3) {
      assert(typeof shortfall === 'string' && shortfall.length > 0, 'shortfall missing');
    }
  }
});

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
if (failed > 0) process.exit(1);
