/**
 * Big Band MusicContext producer (V104p6) — always-on, no feature flag.
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
import type { BigBandCompingStyle, BigBandMusicContextPreset } from './bigBandMusicContextTypes';

/** Cookbook-aligned harmony plans (Scenario 3 shout, 4 soli, 16 rhythm changes, 1 slow blues). */
const BIG_BAND_HARMONY_TEMPLATES: Record<BigBandCompingStyle, readonly HarmonyBarTemplate[]> = {
  brass_punch: [
    { offset: 0, suffix: '7' },
    { offset: 5, suffix: '7' },
    { offset: 0, suffix: '7' },
    { offset: 7, suffix: '7' },
    { offset: 0, suffix: '7' },
    { offset: 2, suffix: '7' },
    { offset: 5, suffix: 'm7' },
    { offset: 7, suffix: '7' },
  ],
  sax_soli: [
    { offset: 2, suffix: 'm7' },
    { offset: 7, suffix: '7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 7, suffix: 'm7' },
    { offset: 2, suffix: '7' },
    { offset: 5, suffix: 'm7' },
    { offset: 7, suffix: '7' },
  ],
  shell_voicing: [
    { offset: 0, suffix: 'maj7' },
    { offset: 9, suffix: '7' },
    { offset: 2, suffix: 'm7' },
    { offset: 5, suffix: '7' },
    { offset: 2, suffix: 'm7' },
    { offset: 9, suffix: '7' },
    { offset: 2, suffix: 'm7' },
    { offset: 5, suffix: '7' },
  ],
  freddie_green: [
    { offset: 0, suffix: '7' },
    { offset: 0, suffix: '7' },
    { offset: 5, suffix: '7' },
    { offset: 5, suffix: '7' },
    { offset: 0, suffix: '7' },
    { offset: 0, suffix: '7' },
    { offset: 7, suffix: '7' },
    { offset: 0, suffix: '7' },
  ],
};

const DEFAULT_TEMPO: Record<BigBandCompingStyle, number> = {
  brass_punch: 168,
  sax_soli: 120,
  shell_voicing: 200,
  freddie_green: 72,
};

const BEAT_PATTERN: Record<BigBandCompingStyle, string> = {
  brass_punch: 'all_beats',
  sax_soli: 'beats_1_3',
  shell_voicing: 'beats_2_4',
  freddie_green: 'beats_2_4',
};

function resolveBigBandHarmonyRawBars(preset: BigBandMusicContextPreset): string[] {
  return barsFromHarmonyTemplate(preset.key, BIG_BAND_HARMONY_TEMPLATES[preset.compingStyle]);
}

/** MusicContext snapshot from Big Band comping preset; harmony normalised before checksum. */
export function buildMusicContextFromBigBand(preset: BigBandMusicContextPreset): MusicContext {
  const harmonyBars = resolveBigBandHarmonyRawBars(preset).map(normalizeChordSymbol);
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
    presetId: 'big_band',
    key: { root, mode: 'major' },
    meter: { beats: 4, beatType: 4 },
    bpm: tempo,
    totalBars: harmonyBars.length,
    harmony,
    provenance: {
      sourceEngineId: 'big_band',
      capturedAt: Date.now(),
    },
    receipts: [
      {
        engine: 'big_band',
        kind: 'big_band_realisation_complete',
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
