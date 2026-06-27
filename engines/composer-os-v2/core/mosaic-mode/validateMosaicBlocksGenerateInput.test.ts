import { describe, expect, it } from 'vitest';
import { validateMosaicBlocksGenerateInput } from './validateMosaicBlocksGenerateInput';
import type { MusicianMosaicSectionPlanEntry } from './stitchMosaicBlocks';

const blockA =
  'Em(maj7) | Fmaj7#11/E | Am6 | Cmaj7 | G7sus4 | F#m7b5 | B7alt | Em(add9)';
const blockB = 'Dmaj7 | A/C# | Bm7 | Gmaj7 | D/F# | Em7 | A7 | Dmaj9';

function validPlan(): {
  chordProgressionText: string;
  totalBars: number;
  mosaicSectionPlan: MusicianMosaicSectionPlanEntry[];
} {
  return {
    chordProgressionText: `${blockA} | ${blockB}`,
    totalBars: 16,
    mosaicSectionPlan: [
      { sectionLabel: 'A', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' },
      { sectionLabel: 'B', startBar: 9, endBar: 16, songwriterStyleId: 'marr' },
    ],
  };
}

describe('validateMosaicBlocksGenerateInput', () => {
  it('pass - valid 16-bar stitched input', () => {
    const input = validPlan();
    const result = validateMosaicBlocksGenerateInput(input);
    expect(result).toEqual({ ok: true, ...input });
  });

  it('fail - empty progression text', () => {
    const input = validPlan();
    const result = validateMosaicBlocksGenerateInput({
      ...input,
      chordProgressionText: '   ',
    });
    expect(result).toEqual({ ok: false, error: 'Stitched chord progression is empty.' });
  });

  it('fail - bars below 16', () => {
    const input = validPlan();
    const result = validateMosaicBlocksGenerateInput({
      chordProgressionText: blockA,
      totalBars: 8,
      mosaicSectionPlan: input.mosaicSectionPlan,
    });
    expect(result).toEqual({
      ok: false,
      error: 'Mosaic parent length must be a multiple of 8 (≥16 bars).',
    });
  });

  it('fail - bars not divisible by 8', () => {
    const twentyBars = Array.from({ length: 20 }, (_, i) => `C${i + 1}`).join(' | ');
    const result = validateMosaicBlocksGenerateInput({
      chordProgressionText: twentyBars,
      totalBars: 20,
      mosaicSectionPlan: validPlan().mosaicSectionPlan,
    });
    expect(result).toEqual({
      ok: false,
      error: 'Mosaic parent length must be a multiple of 8 (≥16 bars).',
    });
  });

  it('fail - plan length does not match totalBars / 8', () => {
    const input = validPlan();
    const result = validateMosaicBlocksGenerateInput({
      ...input,
      mosaicSectionPlan: [
        ...input.mosaicSectionPlan,
        { sectionLabel: 'C', startBar: 17, endBar: 24, songwriterStyleId: 'fripp' },
      ],
    });
    expect(result).toEqual({
      ok: false,
      error: 'mosaicSectionPlan length (3) does not match 2 blocks.',
    });
  });

  it('fail - section bar range does not match expected contiguous slot', () => {
    const input = validPlan();
    const result = validateMosaicBlocksGenerateInput({
      ...input,
      mosaicSectionPlan: [
        { sectionLabel: 'A', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' },
        { sectionLabel: 'B', startBar: 10, endBar: 17, songwriterStyleId: 'marr' },
      ],
    });
    expect(result).toEqual({
      ok: false,
      error: 'mosaicSectionPlan block 1 bar range must be 9–16 with a composer.',
    });
  });

  it('fail - empty songwriterStyleId', () => {
    const input = validPlan();
    const result = validateMosaicBlocksGenerateInput({
      ...input,
      mosaicSectionPlan: [
        { sectionLabel: 'A', startBar: 1, endBar: 8, songwriterStyleId: 'verlaine' },
        { sectionLabel: 'B', startBar: 9, endBar: 16, songwriterStyleId: '   ' },
      ],
    });
    expect(result).toEqual({
      ok: false,
      error: 'mosaicSectionPlan block 1 bar range must be 9–16 with a composer.',
    });
  });

  it('pass - unknown composer id (no registry check in current inline logic)', () => {
    const input = validPlan();
    const result = validateMosaicBlocksGenerateInput({
      ...input,
      mosaicSectionPlan: [
        { sectionLabel: 'A', startBar: 1, endBar: 8, songwriterStyleId: 'not_in_duo_registry' },
        { sectionLabel: 'B', startBar: 9, endBar: 16, songwriterStyleId: 'marr' },
      ],
    });
    expect(result.ok).toBe(true);
  });
});