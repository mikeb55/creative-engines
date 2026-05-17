import {
  detectBarCountMismatch,
  lightCountUserChordBars,
  mergeUserChordTimelineToBarCount,
  normalizeUserChordSymbol,
  ORBIT_28_BAR_PROGRESSION,
  parseUserChordInput,
} from './parseUserChordInput';
import type { CompositionContext } from '../compositionContext';

const emptyContext = {} as CompositionContext;

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
        r.timeline[1]!.normalizedSymbol.includes('/') &&
        !r.timeline[0]!.beatLevelChords
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

  tests.push({
    name: 'V2 beat-level slash: Dm7 / G7 → two beats in one bar',
    ok: (() => {
      const r = parseUserChordInput('Dm7 / G7');
      return (
        r.chordCount === 1 &&
        r.timeline[0]!.beatLevelChords?.length === 2 &&
        r.timeline[0]!.beatLevelChords![0]!.beatIndex === 0 &&
        r.timeline[0]!.beatLevelChords![1]!.beatIndex === 2 &&
        r.timeline[0]!.beatLevelChords![0]!.beatDuration === 0.5 &&
        r.timeline[0]!.beatLevelChords![1]!.normalizedSymbol.includes('G7')
      );
    })(),
  });

  tests.push({
    name: 'V2 slash bass unchanged: G/F single bar',
    ok: (() => {
      const r = parseUserChordInput('G/F');
      return r.chordCount === 1 && !r.timeline[0]!.beatLevelChords && r.timeline[0]!.normalizedSymbol.includes('/');
    })(),
  });

  tests.push({
    name: 'V2 comma delimiter: 4 chords',
    ok: (() => {
      const r = parseUserChordInput('Dm7, G7, Cmaj7, Am');
      return r.chordCount === 4;
    })(),
  });

  tests.push({
    name: 'V2 mixed comma + pipe',
    ok: (() => {
      const r = parseUserChordInput('Dm7, G7 | Cmaj7 | Am');
      return r.chordCount === 4;
    })(),
  });

  tests.push({
    name: 'V2 xN after comma delimiter',
    ok: (() => {
      const r = parseUserChordInput('Cmaj7 x2, Am');
      return r.chordCount === 3;
    })(),
  });

  tests.push({
    name: 'V2 comma with N.C.',
    ok: (() => {
      const r = parseUserChordInput('Dm7, N.C., G7');
      return r.chordCount === 3 && r.timeline[1]!.normalizedSymbol === 'NC';
    })(),
  });

  tests.push({
    name: 'V2 stretch: 4 chords → 8 bars',
    ok: (() => {
      const parsed = parseUserChordInput('C | Dm | G | Am');
      const merged = mergeUserChordTimelineToBarCount(parsed.timeline, 8, 'stretch', emptyContext);
      return (
        merged.ok &&
        merged.bars.length === 8 &&
        merged.bars[0]!.normalizedSymbol.includes('C') &&
        merged.bars[7]!.normalizedSymbol.includes('Am')
      );
    })(),
  });

  tests.push({
    name: 'V2 stretch: each chord spans 2 bars (4→8)',
    ok: (() => {
      const parsed = parseUserChordInput('C | Dm | G | Am');
      const merged = mergeUserChordTimelineToBarCount(parsed.timeline, 8, 'stretch', emptyContext);
      if (!merged.ok) return false;
      return merged.bars[0]!.normalizedSymbol === merged.bars[1]!.normalizedSymbol;
    })(),
  });

  tests.push({
    name: 'V2 compress: 8 chords → 4 bars',
    ok: (() => {
      const parsed = parseUserChordInput('C | C | Dm | Dm | G | G | Am | Am');
      const merged = mergeUserChordTimelineToBarCount(parsed.timeline, 4, 'compress', emptyContext);
      return merged.ok && merged.bars.length === 4;
    })(),
  });

  tests.push({
    name: 'V2 compress: truncate with warning when still too many',
    ok: (() => {
      const parsed = parseUserChordInput('C | Dm | G | Am | Bb | Eb | Ab | Db');
      const merged = mergeUserChordTimelineToBarCount(parsed.timeline, 4, 'compress', emptyContext);
      return (
        merged.ok &&
        merged.bars.length === 4 &&
        (merged.bars[3]!.warningReason?.includes('truncated') ?? false)
      );
    })(),
  });

  tests.push({
    name: 'V2 beat-level passes through merge',
    ok: (() => {
      const parsed = parseUserChordInput('Dm7 / G7 | Cmaj7');
      const merged = mergeUserChordTimelineToBarCount(parsed.timeline, 2, null, emptyContext);
      return merged.ok && merged.bars[0]!.beatLevelChords?.length === 2;
    })(),
  });

  tests.push({
    name: 'V2 N > M blocks without compress resolution',
    ok: (() => {
      const parsed = parseUserChordInput('C | Dm | G | Am | Bb');
      const merged = mergeUserChordTimelineToBarCount(parsed.timeline, 4, null, emptyContext);
      return !merged.ok;
    })(),
  });

  return tests;
}
