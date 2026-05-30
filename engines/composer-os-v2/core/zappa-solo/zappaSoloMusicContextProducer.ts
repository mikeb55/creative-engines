/**
 * Zappa Solo MusicContext producer (V106p2) — always-on, no feature flag.
 * Melodic dramatist over supplied harmony; never authors chord symbols.
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
import { realiseZappaSoloMusicContext } from './zappaSoloMusicContextRealisation';
import type { ZappaSoloMusicContextPreset } from './zappaSoloMusicContextTypes';

/** MusicContext from Zappa solo over supplied harmony — checksum after normalisation. */
export function buildMusicContextFromZappaSolo(preset: ZappaSoloMusicContextPreset): MusicContext {
  if (!preset.harmonyBars.length) {
    throw new Error('ZappaSoloMusicContextPreset requires at least one harmony bar');
  }

  const harmonyBars = preset.harmonyBars.map(normalizeChordSymbol);
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: computeMusicContextChecksum(harmonyBars),
    source: 'locked',
  };
  const expected = computeMusicContextChecksum(harmonyBars);
  if (harmony.checksum !== expected) {
    throw new Error('Zappa solo harmony checksum mismatch after normalisation');
  }

  const keyRoot =
    typeof preset.key === 'string'
      ? normalizeKeyRoot(preset.key).root
      : typeof preset.key === 'number'
        ? wybleEtudeKeyRootName(preset.key as PitchClass)
        : inferKeyRootFromChordSymbols(harmonyBars);
  const { root, mode } = normalizeKeyRoot(keyRoot);

  const { receipt, motif } = realiseZappaSoloMusicContext(
    preset,
    harmonyBars,
    root,
    harmony.checksum,
  );

  return {
    schemaVersion: '1.0',
    seed: preset.seed ?? 0,
    presetId: 'zappa_solo',
    key: { root, mode },
    meter: { beats: 4, beatType: 4 },
    bpm: preset.bpm ?? 120,
    totalBars: harmonyBars.length,
    harmony,
    ...(motif ? { motif } : {}),
    provenance: {
      sourceEngineId: 'zappa_solo',
      capturedAt: Date.now(),
    },
    receipts: [
      {
        engine: 'zappa_solo',
        kind: 'zappa_solo_realisation_complete',
        payload: receipt,
      },
    ],
  };
}
