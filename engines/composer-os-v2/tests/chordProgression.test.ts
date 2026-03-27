/**
 * Chord progression input + custom harmony integration (Guitar–Bass Duo).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateComposition } from '../app-api/generateComposition';
import {
  normalizeChordProgressionSeparators,
  parseChordProgressionInput,
  buildChordSymbolPlanFromBars,
  validateChordSymbolPlanCoversBars,
} from '../core/harmony/chordProgressionParser';
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
    name: 'Normalize: Cm7, F7 ; Bbmaj7 / G7 → pipe-separated',
    ok:
      normalizeChordProgressionSeparators('Cm7, F7 ; Bbmaj7 / G7') === 'Cm7 | F7 | Bbmaj7 | G7',
  });

  tests.push({
    name: 'Parser: 8 bars mixed commas, semicolons, pipes matches pipe-only',
    ok: (() => {
      const mixed = 'Dm9, G13; Cmaj9| A7alt; Dm9 | G13 | Cmaj9 , A7alt';
      const pipes = 'Dm9 | G13 | Cmaj9 | A7alt | Dm9 | G13 | Cmaj9 | A7alt';
      const a = parseChordProgressionInput(mixed);
      const b = parseChordProgressionInput(pipes);
      return a.ok && b.ok && JSON.stringify(a.bars) === JSON.stringify(b.bars);
    })(),
  });

  tests.push({
    name: 'Parser: commas only with slash bass tokens',
    ok: (() => {
      const mixed =
        'D/F#, G/B, Cmaj7/E, A7alt, D/F#, G/B, Cmaj7/E, A7alt';
      const pipes = 'D/F# | G/B | Cmaj7/E | A7alt | D/F# | G/B | Cmaj7/E | A7alt';
      const a = parseChordProgressionInput(mixed);
      const b = parseChordProgressionInput(pipes);
      return a.ok && b.ok && JSON.stringify(a.bars) === JSON.stringify(b.bars);
    })(),
  });

  tests.push({
    name: 'Parser: pipe cell with spaced slash uses first chord; no-pipe input splits spaced / in normalize',
    ok: (() => {
      const pipeCell = parseChordProgressionInput(
        'Dm9 | G13 | Bbmaj7 / G7 | A7alt | Dm9 | G13 | Cmaj9 | A7alt'
      );
      const noPipeNorm = normalizeChordProgressionSeparators('Cm7, F7 ; Bbmaj7 / G7');
      return (
        pipeCell.ok &&
        pipeCell.bars[2] === 'Bbmaj7' &&
        pipeCell.bars[3] === 'A7alt' &&
        noPipeNorm === 'Cm7 | F7 | Bbmaj7 | G7'
      );
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
    name: 'Parser: A7/C# slash bass',
    ok: (() => {
      const r = parseChordProgressionInput(
        'D/F# | G/B | Cmaj7/E | A7/C# | D/F# | G/B | Cmaj7/E | A7/C#'
      );
      return r.ok && r.bars[3] === 'A7/C#' && parseChordSymbol('A7/C#').slashBassPc === 1;
    })(),
  });

  tests.push({
    name: 'harmonyMode custom + empty text fails before generation',
    ok: (() => {
      const r = runGoldenPath(9, { harmonyMode: 'custom', chordProgressionText: '' });
      return (
        !r.success &&
        r.errors.some((e) => e.toLowerCase().includes('empty')) &&
        r.context.generationMetadata.chordProgressionParseFailed === true &&
        r.context.generationMetadata.harmonySource === undefined &&
        r.context.generationMetadata.builtInHarmonyFallbackOccurred === false
      );
    })(),
  });

  tests.push({
    name: 'Chord symbol plan validator: contiguous 8 bars',
    ok: (() => {
      const p = buildChordSymbolPlanFromBars(['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D']);
      return validateChordSymbolPlanCoversBars(p, 8) === null;
    })(),
  });

  tests.push({
    name: 'harmonyMode builtin ignores chordProgressionText',
    ok: (() => {
      const r = runGoldenPath(9, {
        harmonyMode: 'builtin',
        chordProgressionText: 'Em7 | Em7 | Em7 | Em7 | Em7 | Em7 | Em7 | Em7',
      });
      if (!r.success) return false;
      const g = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
      return g?.measures.find((m) => m.index === 1)?.chord === 'Dmin9';
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
      const r = runGoldenPath(61, { chordProgressionText: text });
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
      return (
        r.success &&
        !!r.xml &&
        r.xml.includes('<bass-step>F</bass-step>') &&
        r.xml.includes('<bass-alter>1</bass-alter>')
      );
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

  tests.push({
    name: 'generateComposition: custom progression writes MusicXML file',
    ok: (() => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-duo-chord-'));
      try {
        const r = generateComposition(
          {
            presetId: 'guitar_bass_duo',
            styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
            seed: 4242,
            harmonyMode: 'custom',
            chordProgressionText: 'Dm9 | G13 | Cmaj9 | A7alt | Dm9 | G13 | Cmaj9 | A7alt',
          },
          dir
        );
        return r.success && !!r.filepath && fs.existsSync(r.filepath);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    })(),
  });

  tests.push({
    name: 'Mixed slash + standard progression: not built-in-only labels',
    ok: (() => {
      const text =
        'Dm9 | G/B | Cmaj7/E | A7/C# | Dm9 | G13 | Cmaj9 | A7alt';
      const parsed = parseChordProgressionInput(text);
      if (!parsed.ok) return false;
      const r = runGoldenPath(88, { harmonyMode: 'custom', chordProgressionText: text });
      if (!r.success || !r.xml) return false;
      const g = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
      if (!g) return false;
      for (let i = 1; i <= 8; i++) {
        const m = g.measures.find((x) => x.index === i);
        if (m?.chord !== parsed.bars[i - 1]) return false;
      }
      if (!r.xml.includes('kind text="m9"')) return false;
      return (
        r.xml.includes('<bass-step>B</bass-step>') &&
        r.xml.includes('<bass-step>E</bass-step>') &&
        r.xml.includes('<bass-step>C</bass-step>') &&
        r.xml.includes('<bass-alter>1</bass-alter>')
      );
    })(),
  });

  tests.push({
    name: 'generateComposition: custom + slash progression writes file',
    ok: (() => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-duo-slash-'));
      try {
        const r = generateComposition(
          {
            presetId: 'guitar_bass_duo',
            styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
            seed: 77,
            harmonyMode: 'custom',
            chordProgressionText:
              'D/F# | G/B | Cmaj7/E | A7/C# | D/F# | G/B | Cmaj7/E | A7/C#',
          },
          dir
        );
        return r.success && !!r.filepath && fs.existsSync(r.filepath);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    })(),
  });

  tests.push({
    name: 'V3.5: C# symbols — custom harmony applied (not builtin Dm9)',
    ok: (() => {
      const text =
        'C#maj7 | D#m7 | G#7 | C#maj7 | C#maj7 | D#m7 | G#7 | C#maj7';
      const p = parseChordProgressionInput(text);
      if (!p.ok) return false;
      const r = runGoldenPath(15001, { harmonyMode: 'custom', chordProgressionText: text });
      if (!r.success) return false;
      const g = r.score.parts.find((x) => x.instrumentIdentity === 'clean_electric_guitar');
      const c1 = g?.measures.find((m) => m.index === 1)?.chord;
      return c1 === p.bars[0] && c1 !== 'Dmin9' && r.context.generationMetadata.harmonySource === 'custom';
    })(),
  });

  tests.push({
    name: 'V3.5: Cb symbols — custom harmony applied (not builtin Dm9)',
    ok: (() => {
      const text =
        'Cbmaj7 | Dbm7 | Gb7 | Cbmaj7 | Cbmaj7 | Dbm7 | Gb7 | Cbmaj7';
      const p = parseChordProgressionInput(text);
      if (!p.ok) return false;
      const r = runGoldenPath(15002, { harmonyMode: 'custom', chordProgressionText: text });
      if (!r.success) return false;
      const g = r.score.parts.find((x) => x.instrumentIdentity === 'clean_electric_guitar');
      const c1 = g?.measures.find((m) => m.index === 1)?.chord;
      return c1 === p.bars[0] && c1 !== 'Dmin9' && r.context.generationMetadata.harmonySource === 'custom';
    })(),
  });

  tests.push({
    name: 'V3.5: invalid bar count — generateComposition error + parse failed flag',
    ok: (() => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-duo-v35-'));
      try {
        const r = generateComposition(
          {
            presetId: 'guitar_bass_duo',
            styleStack: { primary: 'barry_harris', weights: { primary: 1 } },
            seed: 99,
            harmonyMode: 'custom',
            chordProgressionText: 'C | D',
          },
          dir
        );
        return (
          !r.success &&
          typeof r.error === 'string' &&
          r.error.includes('Invalid chord progression') &&
          r.chordProgressionParseFailed === true
        );
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    })(),
  });

  return tests;
}
