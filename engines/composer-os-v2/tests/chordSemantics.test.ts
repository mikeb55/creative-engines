/**
 * Unified ChordSemantics: root/bass, extensions, alterations (aligned with MusicXML harmony rules).
 */

import { buildChordSemantics } from '../../core/chordSemantics';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function altsEqual(
  a: { degree: number; alter: -1 | 1 }[],
  b: { degree: number; alter: -1 | 1 }[]
): boolean {
  if (a.length !== b.length) return false;
  const key = (x: { degree: number; alter: number }) => `${x.degree}:${x.alter}`;
  const sa = [...a].map(key).sort();
  const sb = [...b].map(key).sort();
  return sa.every((v, i) => v === sb[i]);
}

export function runChordSemanticsTests(): { name: string; ok: boolean }[] {
  const tests: { name: string; ok: boolean }[] = [];

  tests.push({
    name: 'Cmaj7#11: root C, extensions [7,11], alteration #11',
    ok: (() => {
      const s = buildChordSemantics('Cmaj7#11');
      assert(s.root === 'C', 'root');
      assert(s.bass === undefined, 'bass');
      assert(s.quality === 'major', 'quality');
      assert(arraysEqual(s.extensions, [7, 11]), `extensions ${JSON.stringify(s.extensions)}`);
      assert(altsEqual(s.alterations, [{ degree: 11, alter: 1 }]), `alts ${JSON.stringify(s.alterations)}`);
      return true;
    })(),
  });

  tests.push({
    name: 'G13sus: root G, suspended, stacked 13th extensions, omission 3',
    ok: (() => {
      const s = buildChordSemantics('G13sus');
      assert(s.root === 'G', 'root');
      assert(s.bass === undefined, 'bass');
      assert(s.quality === 'suspended', 'quality');
      assert(arraysEqual(s.extensions, [7, 9, 11, 13]), `extensions ${JSON.stringify(s.extensions)}`);
      assert(s.flags.sus === true, 'sus');
      assert(arraysEqual(s.omissions, [3]), 'omissions');
      return true;
    })(),
  });

  tests.push({
    name: 'A7alt: root A, dominant, ext 7, alt alterations b9/#9/b5/#5',
    ok: (() => {
      const s = buildChordSemantics('A7alt');
      assert(s.root === 'A', 'root');
      assert(s.bass === undefined, 'bass');
      assert(s.quality === 'dominant', 'quality');
      assert(arraysEqual(s.extensions, [7]), `extensions ${JSON.stringify(s.extensions)}`);
      assert(s.flags.alt === true, 'alt flag');
      const expected = [
        { degree: 9, alter: -1 as const },
        { degree: 9, alter: 1 as const },
        { degree: 5, alter: -1 as const },
        { degree: 5, alter: 1 as const },
      ];
      assert(altsEqual(s.alterations, expected), `alts ${JSON.stringify(s.alterations)}`);
      return true;
    })(),
  });

  tests.push({
    name: 'C6/9: root C, additions 6 and 9, empty extension stack',
    ok: (() => {
      const s = buildChordSemantics('C6/9');
      assert(s.root === 'C', 'root');
      assert(s.bass === undefined, 'bass');
      assert(arraysEqual(s.additions, [6, 9]), `additions ${JSON.stringify(s.additions)}`);
      assert(arraysEqual(s.extensions, []), `extensions ${JSON.stringify(s.extensions)}`);
      return true;
    })(),
  });

  tests.push({
    name: 'Dm9/A: root D, bass A, minor ninth stack',
    ok: (() => {
      const s = buildChordSemantics('Dm9/A');
      assert(s.root === 'D', 'root');
      assert(s.bass === 'A', 'bass');
      assert(s.quality === 'minor', 'quality');
      assert(arraysEqual(s.extensions, [7, 9]), `extensions ${JSON.stringify(s.extensions)}`);
      return true;
    })(),
  });

  return tests;
}
