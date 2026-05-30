/**
 * SY dual-guitar custom tuning MusicContext producer (V106p3) — always-on, no feature flag.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  computeMusicContextChecksum,
  inferKeyRootFromChordSymbols,
  normalizeKeyRoot,
} from '../music-context/musicContextAdapters';
import { wybleEtudeKeyRootName } from '../music-context/wybleEtudePresetProgressions';
import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import type { MusicContext, MusicContextHarmony } from '../music-context/musicContextTypes';
import { realiseSYTuningMusicContext } from './syTuningRealisation';
import type { SYTuningPreset } from './syTuningTypes';

/** MusicContext from SY tuning shape-resonance producer — harmony normalised before checksum. */
export function buildMusicContextFromSYTuning(preset: SYTuningPreset): MusicContext {
  const result = realiseSYTuningMusicContext(preset);
  const harmonyBars = result.harmonyBars.map(normalizeChordSymbol);
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: computeMusicContextChecksum(harmonyBars),
    source: 'generated',
  };
  const expected = computeMusicContextChecksum(harmonyBars);
  if (harmony.checksum !== expected) {
    throw new Error('SY tuning harmony checksum mismatch after normalisation');
  }
  if (harmony.checksum !== result.receipt.harmonyChecksum) {
    throw new Error('SY tuning harmony checksum drift from realisation');
  }

  const keyRoot =
    typeof preset.key === 'number'
      ? wybleEtudeKeyRootName(preset.key as PitchClass)
      : inferKeyRootFromChordSymbols(harmonyBars);
  const { root, mode } = normalizeKeyRoot(keyRoot);
  const g1 = result.guitar1Tuning;

  return {
    schemaVersion: '1.0',
    seed: preset.seed ?? 0,
    presetId: 'sy_tuning',
    key: { root, mode },
    meter: { beats: 4, beatType: 4 },
    bpm: preset.bpm ?? 120,
    totalBars: harmonyBars.length,
    harmony,
    tuning: {
      name: g1.id,
      strings: [...g1.strings],
      capo: 0,
    },
    provenance: {
      sourceEngineId: 'sy_tuning',
      capturedAt: Date.now(),
    },
    receipts: [
      {
        engine: 'sy_tuning',
        kind: 'sy_tuning_realisation_complete',
        payload: result.receipt,
      },
    ],
  };
}
