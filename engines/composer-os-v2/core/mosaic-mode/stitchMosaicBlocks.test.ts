import { describe, expect, it } from 'vitest';
import { stitchMosaicBlocks } from './stitchMosaicBlocks';

const blockA =
  'Em(maj7) | Fmaj7#11/E | Am6 | Cmaj7 | G7sus4 | F#m7b5 | B7alt | Em(add9)';
const blockB = 'Dmaj7 | A/C# | Bm7 | Gmaj7 | D/F# | Em7 | A7 | Dmaj9';
const blockC = 'Cm7 | Fm7 | Bb7 | Ebmaj7 | Abmaj7 | Dm7b5 | G7alt | Cm(add9)';

function assertPlanInvariant(
  plan: Array<{ sectionLabel: string; startBar: number; endBar: number; songwriterStyleId: string }>,
  blockCount: number
): void {
  expect(plan.length).toBe(blockCount);
  expect(plan[0]?.startBar).toBe(1);
  for (let i = 0; i < plan.length; i++) {
    const row = plan[i]!;
    expect(row.endBar - row.startBar).toBe(7);
    if (i > 0) {
      expect(row.startBar).toBe(plan[i - 1]!.endBar + 1);
    }
  }
  expect(plan[plan.length - 1]?.endBar).toBe(blockCount * 8);
}

describe('stitchMosaicBlocks', () => {
  it('2-block stitch: parent text order + A/B plan', () => {
    const stitched = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ]);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    const { chordProgressionText, mosaicSectionPlan, totalBars } = stitched.result;
    expect(totalBars).toBe(16);
    expect(mosaicSectionPlan.length).toBe(2);
    assertPlanInvariant(mosaicSectionPlan, 2);

    expect(mosaicSectionPlan[0]).toEqual({
      sectionLabel: 'A',
      startBar: 1,
      endBar: 8,
      songwriterStyleId: 'verlaine',
    });
    expect(mosaicSectionPlan[1]).toEqual({
      sectionLabel: 'B',
      startBar: 9,
      endBar: 16,
      songwriterStyleId: 'marr',
    });

    const chords = chordProgressionText.split(' | ');
    expect(chords).toHaveLength(16);
    expect(chords[0]).toBe('Em(maj7)');
    expect(chords[7]).toBe('Em(add9)');
    expect(chords[8]).toBe('Dmaj7');
    expect(chords[15]).toBe('Dmaj9');

    for (const row of mosaicSectionPlan) {
      expect(row).not.toHaveProperty('chords');
    }
  });

  it('reorder: swap blocks 0↔2 keeps block-3 chords + composer at bars 1–8', () => {
    const blocks = [
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
      { chordsText: blockC, songwriterStyleId: 'fripp' },
    ];
    const swapped = [blocks[2]!, blocks[1]!, blocks[0]!];
    const stitched = stitchMosaicBlocks(swapped);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    const firstEight = stitched.result.chordProgressionText.split(' | ').slice(0, 8);
    expect(firstEight.join(' | ')).toBe(blockC);
    expect(stitched.result.mosaicSectionPlan[0]?.songwriterStyleId).toBe('fripp');
    assertPlanInvariant(stitched.result.mosaicSectionPlan, 3);
  });

  it('duplicate: +1 section, matching chords + composer on adjacent pair', () => {
    const blocks = [
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ];
    const duplicated = [
      blocks[0]!,
      { chordsText: blocks[0]!.chordsText, songwriterStyleId: blocks[0]!.songwriterStyleId },
      blocks[1]!,
    ];
    const stitched = stitchMosaicBlocks(duplicated);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    expect(stitched.result.totalBars).toBe(24);
    assertPlanInvariant(stitched.result.mosaicSectionPlan, 3);

    const chords = stitched.result.chordProgressionText.split(' | ');
    expect(chords.slice(0, 8).join(' | ')).toBe(blockA);
    expect(chords.slice(8, 16).join(' | ')).toBe(blockA);
    expect(stitched.result.mosaicSectionPlan[0]?.songwriterStyleId).toBe('verlaine');
    expect(stitched.result.mosaicSectionPlan[1]?.songwriterStyleId).toBe('verlaine');
  });

  it('delete middle (3→2): parent = block1 + block3, labels A,B', () => {
    const blocks = [
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
      { chordsText: blockC, songwriterStyleId: 'fripp' },
    ];
    const afterDelete = [blocks[0]!, blocks[2]!];
    const stitched = stitchMosaicBlocks(afterDelete);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    expect(stitched.result.totalBars).toBe(16);
    expect(stitched.result.mosaicSectionPlan.length).toBe(2);
    expect(stitched.result.mosaicSectionPlan[0]?.sectionLabel).toBe('A');
    expect(stitched.result.mosaicSectionPlan[1]?.sectionLabel).toBe('B');
    expect(stitched.result.mosaicSectionPlan[0]).toMatchObject({ startBar: 1, endBar: 8 });
    expect(stitched.result.mosaicSectionPlan[1]).toMatchObject({ startBar: 9, endBar: 16 });

    const chords = stitched.result.chordProgressionText.split(' | ');
    expect(chords.slice(0, 8).join(' | ')).toBe(blockA);
    expect(chords.slice(8, 16).join(' | ')).toBe(blockC);
    assertPlanInvariant(stitched.result.mosaicSectionPlan, 2);
  });

  it('chords never appear in mosaicSectionPlan JSON', () => {
    const stitched = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ]);
    expect(stitched.ok).toBe(true);
    if (!stitched.ok) return;

    const planJson = JSON.stringify(stitched.result.mosaicSectionPlan);
    expect(planJson).not.toContain('|');
    expect(planJson).not.toMatch(/maj7/i);
    expect(planJson).not.toMatch(/m7/i);
  });

  it('rejects <2 blocks and 7-chord block', () => {
    const oneBlock = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: 'verlaine' },
    ]);
    expect(oneBlock.ok).toBe(false);

    const sevenChords = 'Dm9 | G13 | Cmaj9 | A7alt | Em7 | A7 | Dm7';
    const shortBlock = stitchMosaicBlocks([
      { chordsText: sevenChords, songwriterStyleId: 'verlaine' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ]);
    expect(shortBlock.ok).toBe(false);
  });

  it('rejects missing composer on a section', () => {
    const stitched = stitchMosaicBlocks([
      { chordsText: blockA, songwriterStyleId: '' },
      { chordsText: blockB, songwriterStyleId: 'marr' },
    ]);
    expect(stitched.ok).toBe(false);
    if (stitched.ok) return;
    expect(stitched.error).toMatch(/pick a composer/i);
  });
});
