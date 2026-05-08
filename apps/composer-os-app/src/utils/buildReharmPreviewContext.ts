import type { CompositionContext } from '@composer-os/core/compositionContext';
import { buildDuoLongFormCompositionContextFromBars } from '@composer-os/core/form/buildLongFormFromDuoSections';

/**
 * Locked-harmony preview context for Reharm panel — mirrors pasted progression length (8–64, step 8).
 * Does not run Song Mode slice precompute; {@link getChordForBar} reads locked symbols unless metadata arrays exist.
 */
export function buildReharmPreviewContextFromBars(
  seed: number,
  bars: string[],
  opts?: { songwriterStyleId?: string; chordProgressionInputRaw?: string }
): CompositionContext {
  const { context } = buildDuoLongFormCompositionContextFromBars(seed, bars, {
    chordProgressionInputRaw: opts?.chordProgressionInputRaw,
    presetId: 'guitar_bass_duo',
  });
  const sid = opts?.songwriterStyleId?.trim();
  if (sid) {
    context.generationMetadata = {
      ...context.generationMetadata,
      songwriterStyleId: sid,
    };
  }
  return context;
}
