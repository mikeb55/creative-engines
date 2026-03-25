/**
 * Map parsed chord input → `ChordSymbolPlan` segments + section ranges.
 */

import type { ChordSymbolPlan } from '../compositionContext';
import type { HarmonyScaffoldFromChordInput, ParsedChordInputPlan } from './chordInputTypes';
import { parseChordInputBlocks } from './chordInputParser';

function segmentsFromBars(bars: string[]): ChordSymbolPlan['segments'] {
  const segments: ChordSymbolPlan['segments'] = [];
  let barIndex = 1;
  let i = 0;
  while (i < bars.length) {
    const chord = bars[i];
    let len = 1;
    while (i + len < bars.length && bars[i + len] === chord) len++;
    segments.push({ chord, startBar: barIndex, bars: len });
    barIndex += len;
    i += len;
  }
  return segments;
}

export function buildHarmonyScaffoldFromParsedPlan(plan: ParsedChordInputPlan): HarmonyScaffoldFromChordInput {
  const ranges: HarmonyScaffoldFromChordInput['sectionRanges'] = [];
  let barCursor = 1;
  for (const sec of plan.sections) {
    if (sec.bars.length === 0) continue;
    const endBar = barCursor + sec.bars.length - 1;
    ranges.push({ label: sec.label, startBar: barCursor, endBar });
    barCursor = endBar + 1;
  }
  const totalBars = plan.allBars.length > 0 ? plan.allBars.length : 1;
  const chordSymbolPlan: ChordSymbolPlan = {
    segments: plan.allBars.length ? segmentsFromBars(plan.allBars) : [{ chord: 'N.C.', startBar: 1, bars: 1 }],
    totalBars: Math.max(totalBars, 1),
  };
  return { chordSymbolPlan, sectionRanges: ranges };
}

export function chordInputTextToScaffold(text: string): HarmonyScaffoldFromChordInput {
  const plan = parseChordInputBlocks(text);
  return buildHarmonyScaffoldFromParsedPlan(plan);
}
