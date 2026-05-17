import {
  detectBarCountMismatch,
  lightCountUserChordBars,
  normalizeUserChordSymbol,
  ORBIT_28_BAR_PROGRESSION,
  parseUserChordInput,
} from './parseUserChordInput';

export function runParseUserChordInputTests(): { name: string; ok: boolean }[] {
  const tests: { name: string; ok: boolean }[] = [];

  tests.push({
    name: 'Orbit 28-bar progression — full parse, all ok',
    ok: (() => {
      const r = parseUserChordInput(ORBIT_28_BAR_PROGRESSION);
      return (
        r.chordCount === 28 &&
        r.timeline.length === 28 &&
        !r.hasErrors &&
        r.timeline.every((b) => b.parseConfidence === 'ok')
      );
    })(),
  });

  tests.push({
    name: 'Unicode symbols normalized',
    ok: (() => {
      const n = normalizeUserChordSymbol('F∆7');
      const m = normalizeUserChordSymbol('Bø7');
      return n.includes('maj7') && m.includes('m7b5');
    })(),
  });

  tests.push({
    name: 'xN expansion',
    ok: (() => {
      const r = parseUserChordInput('Fmaj7 x2 | G7');
      return r.chordCount === 3 && r.timeline[0]!.normalizedSymbol.includes('Fmaj7');
    })(),
  });

  tests.push({
    name: 'N.C. handling',
    ok: (() => {
      const r = parseUserChordInput('N.C. | Fmaj7');
      return r.timeline[0]!.normalizedSymbol === 'NC' && r.timeline[0]!.parseConfidence === 'ok';
    })(),
  });

  tests.push({
    name: 'Slash chords preserved',
    ok: (() => {
      const r = parseUserChordInput('G/F | Eb/F');
      return (
        r.chordCount === 2 &&
        r.timeline[0]!.normalizedSymbol.includes('/') &&
        r.timeline[1]!.normalizedSymbol.includes('/')
      );
    })(),
  });

  tests.push({
    name: 'Mixed confidence',
    ok: (() => {
      const r = parseUserChordInput('Fmaj7 | NOTACHORD | G7');
      return r.hasErrors && r.timeline.some((b) => b.parseConfidence === 'ok');
    })(),
  });

  tests.push({
    name: 'N < M mismatch detection',
    ok: (() => {
      const m = detectBarCountMismatch(3, 8);
      return m.kind === 'fewer' && m.chordCount === 3 && m.barCount === 8;
    })(),
  });

  tests.push({
    name: 'N > M mismatch detection',
    ok: (() => {
      const m = detectBarCountMismatch(10, 8);
      return m.kind === 'more';
    })(),
  });

  tests.push({
    name: 'Newline delimiter',
    ok: (() => {
      const r = parseUserChordInput('Fmaj7\nG7\nCmaj7');
      return r.chordCount === 3;
    })(),
  });

  tests.push({
    name: 'Empty input — graceful error',
    ok: (() => {
      const r = parseUserChordInput('   ');
      return r.chordCount === 0 && r.hasErrors;
    })(),
  });

  tests.push({
    name: 'Light count on paste',
    ok: lightCountUserChordBars(ORBIT_28_BAR_PROGRESSION) === 28,
  });

  return tests;
}
