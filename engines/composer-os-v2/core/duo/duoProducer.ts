/**
 * Duo MusicContext producer (V100a shell + V105p4 dual-guitar realisation) — always-on, no feature flag.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  inferKeyRootFromChordSymbols,
  normalizeKeyRoot,
} from '../music-context/musicContextAdapters';
import type { MusicContext, MusicContextHarmony } from '../music-context/musicContextTypes';
import { realiseDuoLowerGuitar } from './duoRealisation';
import type { DuoExportTruth, DuoPreset } from './duoTypes';

export const DEFAULT_DUO_PRESET: DuoPreset = {
  instrumentTopology: 'guitar_bass',
  seed: 0,
};

export function resolveDuoPreset(partial?: Partial<DuoPreset>): DuoPreset {
  return {
    instrumentTopology: partial?.instrumentTopology ?? DEFAULT_DUO_PRESET.instrumentTopology,
    duoIntent:
      partial?.duoIntent === 'conversational' || partial?.duoIntent === 'supportive'
        ? partial.duoIntent
        : undefined,
    seed: partial?.seed ?? DEFAULT_DUO_PRESET.seed,
    bpm: partial?.bpm,
  };
}

/** MusicContext snapshot from duo export truth; upper voice is harmony export surface. */
export function buildMusicContextFromDuo(
  truth: DuoExportTruth,
  presetPartial?: Partial<DuoPreset>,
): MusicContext {
  const preset = resolveDuoPreset(presetPartial);
  const harmonyBars = truth.upperBars.map(normalizeChordSymbol);
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: truth.checksum,
    source: 'generated',
  };
  const { root, mode } = normalizeKeyRoot(inferKeyRootFromChordSymbols(harmonyBars));
  const { diagnostics } = realiseDuoLowerGuitar(truth, preset);

  return {
    schemaVersion: '1.0',
    seed: preset.seed,
    presetId: 'guitar_bass_duo',
    key: { root, mode },
    meter: { beats: 4, beatType: 4 },
    bpm: preset.bpm ?? 120,
    totalBars: harmonyBars.length,
    harmony,
    provenance: {
      sourceEngineId: 'duo',
      capturedAt: truth.capturedAt,
    },
    receipts: [
      {
        engine: 'duo',
        kind: 'duo_realisation_complete',
        payload: {
          instrumentTopology: diagnostics.instrumentTopology,
          duoIntent: diagnostics.duoIntent,
          lowerGuitarEnabled: diagnostics.lowerGuitarEnabled,
          lowerGuitarRoleDistribution: diagnostics.lowerGuitarRoleDistribution,
          registralCollisionCount: diagnostics.registralCollisionCount,
          parallelMotionCount: diagnostics.parallelMotionCount,
          barCount: diagnostics.barCount,
          harmonyChecksum: truth.checksum,
        },
      },
    ],
  };
}
