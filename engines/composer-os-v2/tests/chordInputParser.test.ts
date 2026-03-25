/**
 * Chord input parser + validation + adapter.
 */

import { chordInputTextToScaffold } from '../core/chord-input/chordInputAdapter';
import { parseChordInputBlocks, parsePipeChordLine } from '../core/chord-input/chordInputParser';
import { validateChordInputText } from '../core/chord-input/chordInputValidation';

export function runChordInputParserTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const block = parseChordInputBlocks(`[A]\nC | Dm | G | C\n[B]\nAm | Dm | G | C`);
  out.push({
    ok: block.sections.length === 2 && block.allBars.length === 8,
    name: 'chord input: section blocks flatten to bars',
  });

  const pipe = parsePipeChordLine('C | Dm7 | G7 | Cmaj7');
  out.push({
    ok: pipe.length === 4,
    name: 'chord input: pipe line parses',
  });

  const v = validateChordInputText('C | Dm | G | C');
  out.push({
    ok: v.ok,
    name: 'chord input: validation accepts simple progression',
  });

  const bad = validateChordInputText('Xyz | C');
  out.push({
    ok: !bad.ok,
    name: 'negative: invalid chord token rejected',
  });

  const sc = chordInputTextToScaffold('C | Dm | G | C');
  out.push({
    ok: sc.chordSymbolPlan.segments.length >= 1 && sc.chordSymbolPlan.totalBars >= 4,
    name: 'chord adapter builds chordSymbolPlan scaffold',
  });

  const empty = validateChordInputText('');
  out.push({
    ok: !empty.ok,
    name: 'negative: empty chord input',
  });

  return out;
}
