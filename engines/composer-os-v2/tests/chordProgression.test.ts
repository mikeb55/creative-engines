/**
 * Chord progression input + custom harmony integration (Guitar–Bass Duo).
 */

import { parseChordProgressionInput } from '../core/harmony/chordProgressionParser';
import { parseChordSymbol } from '../core/harmony/chordSymbolAnalysis';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';

export function runChordProgressionTests(): { name: string; ok: boolean }[] {
  const tests: { name: string; ok: boolean }[] = [];

  tests.push({
    name: 'Parser: 8 bars, basic symbols',
    ok: (() => {
      const r = parseChordProgressionInput('Dm9 | G13 | Cmaj9 | A7alt | Dm9 | G13 | Cmaj9 | A7alt');
      return r.ok && r.bars.length === 8 && r.bars[0] === 'Dm9';
    })(),
  });

  tests.push({
    name: 'Parser: multiple chords per bar uses first',
    ok: (() => {
      const r = parseChordProgressionInput(
        'Dm7 G7 | Cmaj7 | A7alt | Dm9 | G13 | Cmaj9 | A7alt | Dm9'
      );
      return r.ok && r.bars[0] === 'Dm7' && r.bars[1] === 'Cmaj7';
    })(),
  });

  tests.push({
    name: 'Parser: slash chords',
    ok: (() => {
      const r = parseChordProgressionInput(
        'D/F# | G/B | Cmaj7/E | A7alt | D/F# | G/B | Cmaj7/E | A7alt'
      );
      return r.ok && r.bars[0] === 'D/F#' && parseChordSymbol(r.bars[2]).slashBassPc === 4;
    })(),
  });

  tests.push({
    name: 'Parser: wrong bar count fails',
    ok: !parseChordProgressionInput('C | D | E').ok,
  });

  tests.push({
    name: 'Parser: invalid token fails',
    ok: !parseChordProgressionInput(
      'ZZZ | G13 | Cmaj9 | A7alt | Dm9 | G13 | Cmaj9 | A7alt'
    ).ok,
  });

  tests.push({
    name: 'Custom progression: generation succeeds',
    ok: runGoldenPath(100, {
      chordProgressionText: 'Dm9 | G13 | Cmaj9 | A7alt | Dm9 | G13 | Cmaj9 | A7alt',
    }).success,
  });

  tests.push({
    name: 'Custom progression: score chords match input',
    ok: (() => {
      const text = 'Em7 | A7 | Dmaj7 | F#m7b5 | Em7 | A7 | Dmaj7 | F#m7b5';
      const p = parseChordProgressionInput(text);
      if (!p.ok) return false;
      const r = runGoldenPath(61, { chordProgressionText: text });
      if (!r.success) return false;
      const g = r.score.parts.find((x) => x.instrumentIdentity === 'clean_electric_guitar');
      if (!g) return false;
      for (let i = 1; i <= 8; i++) {
        const m = g.measures.find((x) => x.index === i);
        if (m?.chord !== p.bars[i - 1]) return false;
      }
      return true;
    })(),
  });

  tests.push({
    name: 'Malformed progression: runGoldenPath fails cleanly',
    ok: (() => {
      const r = runGoldenPath(1, { chordProgressionText: 'only two | bars' });
      return !r.success && r.errors.some((e) => e.length > 0);
    })(),
  });

  tests.push({
    name: 'Slash progression: success and bass spells slash bass',
    ok: (() => {
      const text = 'D/F# | G/B | Cmaj7/E | A7alt | D/F# | G/B | Cmaj7/E | A7alt';
      const r = runGoldenPath(55, { chordProgressionText: text });
      if (!r.success) return false;
      const bass = r.score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
      if (!bass) return false;
      for (const m of bass.measures) {
        const ch = m.chord;
        if (!ch) continue;
        const slashPc = parseChordSymbol(ch).slashBassPc;
        if (slashPc === undefined) continue;
        const has = m.events.some(
          (e) => e.kind === 'note' && (e as { pitch: number }).pitch % 12 === slashPc % 12
        );
        if (!has) return false;
      }
      return true;
    })(),
  });

  tests.push({
    name: 'Export: slash chords appear in MusicXML',
    ok: (() => {
      const r = runGoldenPath(56, {
        chordProgressionText: 'D/F# | G7 | Cmaj7 | A7alt | Dm9 | G13 | Cmaj9 | A7alt',
      });
      return r.success && !!r.xml && r.xml.includes('D') && r.xml.includes('F#');
    })(),
  });

  tests.push({
    name: 'Builtin mode: harmony source metadata',
    ok: runGoldenPath(42).context.generationMetadata.harmonySource === 'builtin',
  });

  tests.push({
    name: 'Custom mode: harmony source metadata',
    ok: (() => {
      const r = runGoldenPath(43, {
        chordProgressionText: 'Dm9 | G13 | Cmaj9 | A7alt | Dm9 | G13 | Cmaj9 | A7alt',
      });
      return r.success && r.context.generationMetadata.harmonySource === 'custom';
    })(),
  });

  return tests;
}
