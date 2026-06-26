/**
 * Tab 2 card state -> MusicianGenerateRequest (extracted from musician.ts blocks-generate handler).
 */
import type { MusicianGenerateRequest } from './musicianTypes';
import { stitchMosaicBlocks } from './stitchMosaicBlocks';

export interface BlockCardState {
  chords: string;
  composerId: string;
}

export type BuildBlocksGenerateRequestResult =
  | { ok: true; request: MusicianGenerateRequest }
  | { ok: false; error: string };

export function buildBlocksGenerateRequest(
  cards: BlockCardState[],
  seed: number
): BuildBlocksGenerateRequestResult {
  const stitched = stitchMosaicBlocks(
    cards.map((b) => ({
      chordsText: b.chords,
      songwriterStyleId: b.composerId,
    }))
  );
  if (!stitched.ok) {
    return { ok: false, error: stitched.error };
  }

  const { chordProgressionText, mosaicSectionPlan, totalBars } = stitched.result;
  const composerSlug = mosaicSectionPlan[0]!.songwriterStyleId;

  return {
    ok: true,
    request: {
      composerSlug,
      seed,
      chordProgressionText,
      totalBars,
      mosaicSectionPlan,
    },
  };
}
