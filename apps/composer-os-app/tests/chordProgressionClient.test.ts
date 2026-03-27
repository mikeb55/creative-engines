/**
 * UI bundle uses the same parser as the engine API (via Vite alias).
 */
import { describe, expect, it } from 'vitest';
import { parseChordProgressionInput } from '../src/utils/chordProgressionClient';

describe('chordProgressionClient', () => {
  it('normalizes mixed separators before counting bars (not raw | count)', () => {
    const fourBars = parseChordProgressionInput('Cm7, F7 ; Bbmaj7 / G7');
    expect(fourBars.ok).toBe(false);
    if (!fourBars.ok) {
      expect(fourBars.error).toMatch(/found 4\)/);
    }
  });

  it('keeps pipe-cell semantics: spaced slash does not add bars when | was used', () => {
    const fourBars = parseChordProgressionInput('Cm7 | F7 | Bbmaj7 / G7 | A7alt');
    expect(fourBars.ok).toBe(false);
    if (!fourBars.ok) {
      expect(fourBars.error).toMatch(/found 4\)/);
    }
  });

  it('accepts an 8-bar line with commas and semicolons', () => {
    const mixed =
      'Dm9, G13; Cmaj9| A7alt; Dm9 | G13 | Cmaj9 , A7alt';
    const r = parseChordProgressionInput(mixed);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bars.length).toBe(8);
    }
  });
});
