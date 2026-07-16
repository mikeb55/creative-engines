/**
 * Riff Generator Phase B Iter 2 - apply HV chord colour to a short chord loop.
 *
 * Uses mosaic getDispatchEntry precompute (same colour surface as global HV overlay).
 * Does not touch riff pattern / riffVrbId. No dispatch entry = identity (bars unchanged).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import {
  extractEffectiveHarmonyFromMetadata,
  getDispatchEntry,
} from '../mosaic-mode/mosaicComposerDispatch';

/**
 * Colour locked chord symbols with HV slice grammar when a dispatch entry exists.
 * Returns the input array unchanged when HV is empty, unknown, or precompute fails length check.
 */
export function colourRiffChordsWithHv(
  bars: readonly string[],
  hvIdRaw: string,
  seed: number
): string[] {
  const base = bars.map((b) => String(b ?? '').trim()).filter((b) => b.length > 0);
  if (base.length < 1) return [...bars];

  const hvId = normalizeHarmonicVoiceId(hvIdRaw);
  if (!hvId) return [...bars];

  const entry = getDispatchEntry(hvId);
  if (!entry) return [...bars];

  const n = base.length;
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: hvId,
    harmonicVoice: hvId,
    parsedCustomProgressionBars: [...base],
  };

  const ctx = {
    systemVersion: '2.0.0',
    presetId: 'guitar_bass_duo',
    seed,
    form: {
      totalBars: n,
      sections: [{ label: 'A', startBar: 1, length: n }],
    },
    lockedHarmonyBarsRaw: [...base],
    generationMetadata,
  } as CompositionContext;

  try {
    entry.precompute(ctx);
  } catch {
    return [...bars];
  }

  const out = extractEffectiveHarmonyFromMetadata(ctx.generationMetadata, hvId);
  if (!Array.isArray(out) || out.length !== n) return [...bars];
  if (!out.every((s) => typeof s === 'string' && s.trim().length > 0)) return [...bars];
  return out.map((s) => s.trim());
}