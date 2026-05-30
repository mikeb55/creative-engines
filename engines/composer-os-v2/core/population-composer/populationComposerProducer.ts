/**
 * Population Composer MusicContext producer (V106p1) — always-on, no feature flag.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  computeMusicContextChecksum,
} from '../music-context/musicContextAdapters';
import { wybleEtudeKeyRootName } from '../music-context/wybleEtudePresetProgressions';
import type { MusicContext, MusicContextHarmony } from '../music-context/musicContextTypes';
import { runPopulationSelection } from './populationComposerSelection';
import type { PopulationComposerPreset } from './populationComposerTypes';

/** MusicContext from population ecology hybrid — harmony normalised before checksum. */
export function buildMusicContextFromPopulation(preset: PopulationComposerPreset): MusicContext {
  const selection = runPopulationSelection(preset);
  const harmonyBars = selection.harmonyBars.map(normalizeChordSymbol);
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: computeMusicContextChecksum(harmonyBars),
    source: 'generated',
  };
  const expected = computeMusicContextChecksum(harmonyBars);
  if (harmony.checksum !== expected) {
    throw new Error('Population composer harmony checksum mismatch after normalisation');
  }

  const key = preset.key ?? 0;
  const root = wybleEtudeKeyRootName(key);
  const bpm = preset.bpm ?? 120;

  return {
    schemaVersion: '1.0',
    seed: preset.seed ?? 0,
    presetId: 'population_composer',
    key: { root, mode: 'major' },
    meter: { beats: 4, beatType: 4 },
    bpm,
    totalBars: harmonyBars.length,
    harmony,
    provenance: {
      sourceEngineId: 'population_composer',
      capturedAt: Date.now(),
    },
    receipts: [
      {
        engine: 'population_composer',
        kind: 'population_composer_realisation_complete',
        payload: {
          generationCount: selection.generationCount,
          dominantProducer: selection.dominantProducer,
          producerWeightHistory: selection.producerWeightHistory,
          dramaticArcCompliance: selection.dramaticArcCompliance,
          barCount: harmonyBars.length,
          harmonyChecksum: harmony.checksum,
          perBarWinners: selection.perBarWinners,
        },
      },
    ],
  };
}
