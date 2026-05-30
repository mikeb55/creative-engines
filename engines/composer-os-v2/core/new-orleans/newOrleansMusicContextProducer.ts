/**
 * New Orleans / funk MusicContext producer (V104p6) — always-on, no feature flag.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  barsFromHarmonyTemplate,
  type HarmonyBarTemplate,
} from '../music-context/compingHarmonyTemplates';
import {
  computeMusicContextChecksum,
} from '../music-context/musicContextAdapters';
import { wybleEtudeKeyRootName } from '../music-context/wybleEtudePresetProgressions';
import type { MusicContext, MusicContextHarmony } from '../music-context/musicContextTypes';
import type {
  NewOrleansCompingStyle,
  NewOrleansMusicContextPreset,
} from './newOrleansMusicContextTypes';

/** Parade / funk harmony plans — second-line I–IV–I–V, bass anticipation, offbeat brass. */
const NEW_ORLEANS_HARMONY_TEMPLATES: Record<NewOrleansCompingStyle, readonly HarmonyBarTemplate[]> = {
  second_line: [
    { offset: 0, suffix: 'maj7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 5, suffix: 'maj7' },
    { offset: 5, suffix: 'maj7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 7, suffix: '7' },
    { offset: 0, suffix: 'maj7' },
  ],
  anticipation_bass: [
    { offset: 0, suffix: 'maj7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 5, suffix: 'maj7' },
    { offset: 4, suffix: '7' },
    { offset: 5, suffix: 'maj7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 7, suffix: '7' },
    { offset: 0, suffix: 'maj7' },
  ],
  brass_punch_offbeat: [
    { offset: 0, suffix: '7' },
    { offset: 5, suffix: '7' },
    { offset: 0, suffix: '7' },
    { offset: 10, suffix: '7' },
    { offset: 2, suffix: 'm7' },
    { offset: 5, suffix: '7alt' },
    { offset: 7, suffix: '7' },
    { offset: 0, suffix: '7' },
  ],
};

const DEFAULT_TEMPO: Record<NewOrleansCompingStyle, number> = {
  second_line: 120,
  anticipation_bass: 108,
  brass_punch_offbeat: 132,
};

const BEAT_PATTERN: Record<NewOrleansCompingStyle, string> = {
  second_line: 'all_beats',
  anticipation_bass: 'beats_2_4',
  brass_punch_offbeat: 'offbeats',
};

function resolveNewOrleansHarmonyRawBars(preset: NewOrleansMusicContextPreset): string[] {
  return barsFromHarmonyTemplate(preset.key, NEW_ORLEANS_HARMONY_TEMPLATES[preset.compingStyle]);
}

/** MusicContext snapshot from New Orleans comping preset; harmony normalised before checksum. */
export function buildMusicContextFromNewOrleans(preset: NewOrleansMusicContextPreset): MusicContext {
  const harmonyBars = resolveNewOrleansHarmonyRawBars(preset).map(normalizeChordSymbol);
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: computeMusicContextChecksum(harmonyBars),
    source: 'generated',
  };
  const root = wybleEtudeKeyRootName(preset.key);
  const tempo = preset.tempo > 0 ? preset.tempo : DEFAULT_TEMPO[preset.compingStyle];
  return {
    schemaVersion: '1.0',
    seed: 0,
    presetId: 'new_orleans',
    key: { root, mode: 'major' },
    meter: { beats: 4, beatType: 4 },
    bpm: tempo,
    totalBars: harmonyBars.length,
    harmony,
    provenance: {
      sourceEngineId: 'new_orleans',
      capturedAt: Date.now(),
    },
    receipts: [
      {
        engine: 'new_orleans',
        kind: 'new_orleans_realisation_complete',
        payload: {
          compingStyle: preset.compingStyle,
          beatPattern: BEAT_PATTERN[preset.compingStyle],
          barCount: harmonyBars.length,
          harmonyChecksum: harmony.checksum,
          bpm: tempo,
        },
      },
    ],
  };
}
