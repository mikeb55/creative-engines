/**
 * Pure apiGenerate payload defaults for Musician Tab 2 mosaic-blocks path.
 * Shared by desktop IPC today; web + desktop can call later.
 */
import type { MusicianMosaicSectionPlanEntry } from './stitchMosaicBlocks';

export interface MosaicBlocksGeneratePayloadInput {
  composerSlug: string;
  seed: number;
  totalBars: number;
  chordProgressionText: string;
  mosaicSectionPlan: MusicianMosaicSectionPlanEntry[];
}

export interface MosaicBlocksGeneratePayload {
  presetId: 'guitar_bass_duo';
  body: Record<string, unknown>;
}

export function buildMosaicBlocksGeneratePayload(
  input: MosaicBlocksGeneratePayloadInput
): MosaicBlocksGeneratePayload {
  const { composerSlug, seed, totalBars, chordProgressionText, mosaicSectionPlan } = input;

  return {
    presetId: 'guitar_bass_duo',
    body: {
      presetId: 'guitar_bass_duo',
      styleStack: {
        primary: 'barry_harris',
        styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
      },
      primarySongwriterStyle: mosaicSectionPlan[0]!.songwriterStyleId,
      seed,
      totalBars,
      longFormEnabled: true,
      bandModeEnabled: true,
      harmonyMode: 'custom_locked',
      chordProgressionText,
      mosaicSectionPlan,
      creativeControlLevel: composerSlug === 'bill_evans' ? 'stable' : 'balanced',
      outputLabel: composerSlug,
      ...(composerSlug === 'bill_evans' ? { musicianPremiumMelody: true } : {}),
    },
  };
}
