/**
 * Shared harmony-bar MusicContext shell (V104p7).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  computeMusicContextChecksum,
  inferKeyRootFromChordSymbols,
  normalizeKeyRoot,
} from './musicContextAdapters';
import type { MusicContext, MusicContextHarmony, MusicContextReceipt } from './musicContextTypes';

export type HarmonyBarsMusicContextParams = {
  harmonyBars: readonly string[];
  sourceEngineId: string;
  presetId: string;
  seed?: number;
  bpm?: number;
  receipts?: readonly MusicContextReceipt[];
  sourceRunId?: string;
};

/** Normalise bars, checksum-after-norm, infer key from harmony. */
export function buildMusicContextFromHarmonyBars(
  params: HarmonyBarsMusicContextParams,
): MusicContext {
  const harmonyBars = params.harmonyBars.map(normalizeChordSymbol);
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: computeMusicContextChecksum(harmonyBars),
    source: 'generated',
  };
  const { root, mode } = normalizeKeyRoot(inferKeyRootFromChordSymbols(harmonyBars));
  return {
    schemaVersion: '1.0',
    seed: params.seed ?? 0,
    presetId: params.presetId,
    key: { root, mode },
    meter: { beats: 4, beatType: 4 },
    bpm: params.bpm ?? 120,
    totalBars: harmonyBars.length,
    harmony,
    provenance: {
      sourceEngineId: params.sourceEngineId,
      capturedAt: Date.now(),
      ...(params.sourceRunId ? { sourceRunId: params.sourceRunId } : {}),
    },
    receipts: params.receipts ? [...params.receipts] : [],
  };
}
