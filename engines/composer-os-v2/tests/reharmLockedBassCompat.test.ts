/**
 * Sustained locked-bass compatibility (contrasting path helper).
 * Run: npx ts-node --transpile-only --project tsconfig.json engines/composer-os-v2/tests/reharmLockedBassCompat.test.ts
 */

import {
  checkSustainedLockedBassCompat,
  explicitExtensionDegrees,
  noteCoversChordSpan,
  structuredChordMemberPcs,
} from '../core/harmony/reharmLockedBassCompat';
import type { AlternativeBar, ReharmLockedEvent } from '../core/harmony/reharmSequenceTypes';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function bar(
  barIndex: number,
  typeId: string,
  rootPc: number
): AlternativeBar {
  return {
    barIndex,
    originalSymbol: 'X',
    substituteChordTypeId: typeId,
    substituteRootPc: rootPc,
    strategy: 'test',
    mappingNull: false,
  };
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

test('structuredChordMemberPcs: F Maj7 includes E (maj7) — inversion OK', () => {
  const pcs = structuredChordMemberPcs('Maj7', 5); // F
  assert(!!pcs, 'pcs');
  assert(pcs!.has(5), 'root F');
  assert(pcs!.has(9), 'A');
  assert(pcs!.has(0), 'C');
  assert(pcs!.has(4), 'E maj7');
});

test('structuredChordMemberPcs: Maj7#11#9 includes #11 and #9', () => {
  const pcs = structuredChordMemberPcs('Maj7#11#9', 0); // C
  assert(!!pcs, 'pcs');
  assert(pcs!.has(6), '#11');
  assert(pcs!.has(3), '#9');
  assert(explicitExtensionDegrees('Maj7#11#9').includes(11), 'ext 11');
  assert(explicitExtensionDegrees('Maj7#11#9').includes(9), 'ext 9');
});

test('noteCoversChordSpan: full cover + sustain-in; short note skipped', () => {
  assert(noteCoversChordSpan(0, 4, 0, 4), 'exact');
  assert(noteCoversChordSpan(-2, 6, 0, 4), 'tie into span');
  assert(!noteCoversChordSpan(0, 2, 0, 4), 'half bar');
  assert(!noteCoversChordSpan(1, 3, 0, 4), 'late attack');
});

test('checkSustainedLockedBassCompat: reject sustained clash; ignore moving bass', () => {
  const bars = [bar(1, 'Maj9', 0)]; // CMaj9 — no Bb
  const sustainedClash: ReharmLockedEvent[] = [
    {
      part: 'bass',
      kind: 'note',
      pc: 10,
      midi: 46,
      onset: 0,
      dur: 4,
      tieIn: false,
      tieOut: false,
      bar: 1,
      metre: '4/4',
    },
  ];
  const bad = checkSustainedLockedBassCompat(bars, sustainedClash, 1, 1);
  assert(!bad.ok, 'should reject');
  if (!bad.ok) {
    assert(bad.kind === 'clash', 'kind clash');
    assert(bad.bar === 1, 'bar');
    assert(bad.bassPc === 10, 'bassPc');
    assert(/Bar 1: sustained bass pc 10 incompatible with CMaj9/.test(bad.reason), bad.reason);
  }

  const moving: ReharmLockedEvent[] = [
    {
      part: 'bass',
      kind: 'note',
      pc: 10,
      midi: 46,
      onset: 0,
      dur: 2,
      tieIn: false,
      tieOut: false,
      bar: 1,
      metre: '4/4',
    },
  ];
  const okMove = checkSustainedLockedBassCompat(bars, moving, 1, 1);
  assert(okMove.ok, 'moving bass unfiltered');

  const memberBass: ReharmLockedEvent[] = [
    {
      part: 'bass',
      kind: 'note',
      pc: 4,
      midi: 40,
      onset: -1,
      dur: 5,
      tieIn: true,
      tieOut: false,
      bar: 1,
      metre: '4/4',
    },
  ];
  const okMember = checkSustainedLockedBassCompat(bars, memberBass, 1, 1);
  assert(okMember.ok, 'E in CMaj9 via sustain-in');
});

test('checkSustainedLockedBassCompat: no lockedEvents → pass', () => {
  const bars = [bar(1, 'Maj7', 5)];
  assert(checkSustainedLockedBassCompat(bars, undefined, 1, 1).ok, 'undefined');
  assert(checkSustainedLockedBassCompat(bars, [], 1, 1).ok, 'empty');
});

test('checkSustainedLockedBassCompat: unresolved chord type → compatibility unknown (not clash)', () => {
  const bars = [bar(1, 'NotAVaultTypeXYZ', 0)];
  const sustained: ReharmLockedEvent[] = [
    {
      part: 'bass',
      kind: 'note',
      pc: 0,
      midi: 36,
      onset: 0,
      dur: 4,
      tieIn: false,
      tieOut: false,
      bar: 1,
      metre: '4/4',
    },
  ];
  const out = checkSustainedLockedBassCompat(bars, sustained, 1, 1);
  assert(!out.ok, 'must exclude');
  if (!out.ok) {
    assert(out.kind === 'unknown', `kind=${out.kind}`);
    assert(out.bassPc === undefined, 'no clash bassPc');
    assert(/compatibility unknown/.test(out.reason), out.reason);
    assert(!/incompatible with/.test(out.reason), 'must not look like musical clash');
  }
});

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) process.exit(1);
