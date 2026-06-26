/**
 * Pure stitch helper ? mirrors runMultiBlockArranger parent + mosaicSectionPlan shape.
 * Shared by Musician renderer (esbuild bundle), IPC body builder, and tests.
 */

export const BARS_PER_MOSAIC_BLOCK = 8;

export interface MusicianMosaicSectionPlanEntry {
  sectionLabel: string;
  startBar: number;
  endBar: number;
  songwriterStyleId: string;
}

export interface MosaicBlockInput {
  chordsText: string;
  songwriterStyleId: string;
}

export interface StitchedMosaicResult {
  chordProgressionText: string;
  mosaicSectionPlan: MusicianMosaicSectionPlanEntry[];
  totalBars: number;
}

export type StitchMosaicBlocksResult =
  | { ok: true; result: StitchedMosaicResult }
  | { ok: false; error: string };

function normalizeProgressionSeparators(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/[,;]/g, '|')
    .replace(/\n+/g, '|')
    .trim();
}

export function parseBlockChords(rawText: string): string[] {
  const trimmed = normalizeProgressionSeparators(rawText);
  if (!trimmed) return [];
  const bars: string[] = [];
  for (const cell of trimmed.split('|')) {
    const token = cell.trim().split(/\s+/).filter(Boolean)[0]?.trim();
    if (!token) continue;
    bars.push(token);
  }
  return bars;
}

export function sectionLabelForIndex(index: number): string {
  return String.fromCharCode(65 + index);
}

export function reindexMosaicSectionPlan(
  blocks: ReadonlyArray<{ songwriterStyleId: string }>
): MusicianMosaicSectionPlanEntry[] {
  return blocks.map((block, i) => ({
    sectionLabel: sectionLabelForIndex(i),
    startBar: i * BARS_PER_MOSAIC_BLOCK + 1,
    endBar: i * BARS_PER_MOSAIC_BLOCK + BARS_PER_MOSAIC_BLOCK,
    songwriterStyleId: block.songwriterStyleId,
  }));
}

export function stitchMosaicBlocks(blocks: MosaicBlockInput[]): StitchMosaicBlocksResult {
  if (blocks.length < 2) {
    return { ok: false, error: 'Add at least two 8-bar sections.' };
  }

  const allChords: string[] = [];
  const plan: MusicianMosaicSectionPlanEntry[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    const composer = block.songwriterStyleId.trim();
    if (!composer) {
      return { ok: false, error: `Section ${sectionLabelForIndex(i)}: pick a composer.` };
    }

    const chords = parseBlockChords(block.chordsText);
    if (chords.length !== BARS_PER_MOSAIC_BLOCK) {
      return {
        ok: false,
        error: `Section ${sectionLabelForIndex(i)} needs exactly ${BARS_PER_MOSAIC_BLOCK} chords (found ${chords.length}).`,
      };
    }

    allChords.push(...chords);
    plan.push({
      sectionLabel: sectionLabelForIndex(i),
      startBar: i * BARS_PER_MOSAIC_BLOCK + 1,
      endBar: i * BARS_PER_MOSAIC_BLOCK + BARS_PER_MOSAIC_BLOCK,
      songwriterStyleId: composer,
    });
  }

  return {
    ok: true,
    result: {
      chordProgressionText: allChords.join(' | '),
      mosaicSectionPlan: plan,
      totalBars: allChords.length,
    },
  };
}
