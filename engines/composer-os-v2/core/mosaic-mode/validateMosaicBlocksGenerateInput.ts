/**
 * Pure mosaic-blocks generate input validation — shared by desktop IPC and web generate path.
 */
import type { MusicianMosaicSectionPlanEntry } from './stitchMosaicBlocks';

export interface ValidateMosaicBlocksGenerateInput {
  chordProgressionText: string;
  totalBars?: number;
  mosaicSectionPlan: MusicianMosaicSectionPlanEntry[];
}

export type ValidateMosaicBlocksGenerateInputResult =
  | {
      ok: true;
      chordProgressionText: string;
      totalBars: number;
      mosaicSectionPlan: MusicianMosaicSectionPlanEntry[];
    }
  | { ok: false; error: string };

export function validateMosaicBlocksGenerateInput(
  input: ValidateMosaicBlocksGenerateInput
): ValidateMosaicBlocksGenerateInputResult {
  const rawProgression =
    typeof input.chordProgressionText === 'string' ? input.chordProgressionText.trim() : '';
  if (!rawProgression) {
    return { ok: false, error: 'Stitched chord progression is empty.' };
  }

  const bars = rawProgression.split(' | ');
  const totalBars =
    typeof input.totalBars === 'number' && input.totalBars === bars.length
      ? input.totalBars
      : bars.length;

  if (bars.length < 16 || bars.length % 8 !== 0) {
    return {
      ok: false,
      error: 'Mosaic parent length must be a multiple of 8 (≥16 bars).',
    };
  }

  const expectedSections = bars.length / 8;
  const mosaicSectionPlan = input.mosaicSectionPlan;
  if (mosaicSectionPlan.length !== expectedSections) {
    return {
      ok: false,
      error: `mosaicSectionPlan length (${mosaicSectionPlan.length}) does not match ${expectedSections} blocks.`,
    };
  }

  for (let i = 0; i < mosaicSectionPlan.length; i++) {
    const section = mosaicSectionPlan[i]!;
    const wantStart = i * 8 + 1;
    const wantEnd = i * 8 + 8;
    if (section.startBar !== wantStart || section.endBar !== wantEnd || !section.songwriterStyleId.trim()) {
      return {
        ok: false,
        error: `mosaicSectionPlan block ${i} bar range must be ${wantStart}–${wantEnd} with a composer.`,
      };
    }
  }

  return {
    ok: true,
    chordProgressionText: rawProgression,
    totalBars,
    mosaicSectionPlan,
  };
}