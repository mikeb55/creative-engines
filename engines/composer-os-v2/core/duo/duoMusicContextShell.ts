/**
 * Duo MusicContext producer shell (V100a) — always-on, no feature flag.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  inferKeyRootFromChordSymbols,
  normalizeKeyRoot,
} from '../music-context/musicContextAdapters';
import type { MusicContext, MusicContextHarmony } from '../music-context/musicContextTypes';
import type { DuoExportTruth } from './duoTypes';

/** MusicContext snapshot from duo export truth; upper voice is harmony export surface. */
export function buildMusicContextFromDuo(truth: DuoExportTruth): MusicContext {
  const harmonyBars = truth.upperBars.map(normalizeChordSymbol);
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: truth.checksum,
    source: 'generated',
  };
  const { root, mode } = normalizeKeyRoot(inferKeyRootFromChordSymbols(harmonyBars));
  return {
    schemaVersion: '1.0',
    seed: 0,
    presetId: 'guitar_bass_duo',
    key: { root, mode },
    meter: { beats: 4, beatType: 4 },
    bpm: 120,
    totalBars: harmonyBars.length,
    harmony,
    provenance: {
      sourceEngineId: 'duo',
      capturedAt: truth.capturedAt,
    },
    receipts: [],
  };
}
