/**
 * String Quartet MusicContext producer (V105p1) — always-on, no feature flag.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import {
  barsFromHarmonyTemplate,
  type HarmonyBarTemplate,
} from '../music-context/compingHarmonyTemplates';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import { wybleEtudeKeyRootName } from '../music-context/wybleEtudePresetProgressions';
import type { MusicContext, MusicContextHarmony } from '../music-context/musicContextTypes';
import {
  assignStringQuartetRoles,
  computeStringQuartetRealisationDiagnostics,
  solveStringQuartetVoiceLeading,
  tritonicFloatEnabled,
} from './stringQuartetMusicContextRealisation';
import type {
  StringQuartetMusicContextPreset,
  StringQuartetTextureArchetype,
} from './stringQuartetMusicContextTypes';

const SQ_HARMONY_TEMPLATES: Record<StringQuartetTextureArchetype, readonly HarmonyBarTemplate[]> = {
  chorale: [
    { offset: 0, suffix: 'maj7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 5, suffix: 'maj7' },
    { offset: 5, suffix: 'maj7' },
    { offset: 7, suffix: '7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 0, suffix: 'maj7' },
  ],
  arco_melody_accompaniment: [
    { offset: 0, suffix: 'maj7' },
    { offset: 2, suffix: 'm7' },
    { offset: 5, suffix: 'm7' },
    { offset: 7, suffix: '7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 2, suffix: 'm7' },
    { offset: 5, suffix: 'm7' },
    { offset: 7, suffix: '7' },
  ],
  pad_suspension: [
    { offset: 0, suffix: 'sus2' },
    { offset: 0, suffix: 'maj7' },
    { offset: 5, suffix: '7sus4' },
    { offset: 5, suffix: 'm7' },
    { offset: 0, suffix: 'sus2' },
    { offset: 0, suffix: 'maj7' },
    { offset: 7, suffix: '7sus4' },
    { offset: 0, suffix: 'maj7' },
  ],
  pizzicato_pulse: [
    { offset: 0, suffix: 'm' },
    { offset: 0, suffix: 'm' },
    { offset: 3, suffix: 'maj7' },
    { offset: 3, suffix: 'maj7' },
    { offset: 0, suffix: 'm' },
    { offset: 0, suffix: 'm' },
    { offset: 5, suffix: 'm7' },
    { offset: 0, suffix: 'm' },
  ],
  tremolo_wash: [
    { offset: 0, suffix: 'maj7#11' },
    { offset: 2, suffix: 'maj7' },
    { offset: 4, suffix: 'maj7#11' },
    { offset: 6, suffix: 'maj7' },
    { offset: 0, suffix: 'maj7#11' },
    { offset: 2, suffix: 'maj7' },
    { offset: 4, suffix: 'maj7#11' },
    { offset: 0, suffix: 'maj7' },
  ],
  contrapuntal_weave: [
    { offset: 0, suffix: 'm7' },
    { offset: 5, suffix: '7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 5, suffix: '7' },
    { offset: 2, suffix: 'm7' },
    { offset: 7, suffix: '7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 0, suffix: 'maj7' },
  ],
  duet_support: [
    { offset: 0, suffix: 'maj7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 2, suffix: 'm7' },
    { offset: 5, suffix: '7' },
    { offset: 0, suffix: 'maj7' },
    { offset: 2, suffix: 'm7' },
    { offset: 5, suffix: '7' },
    { offset: 0, suffix: 'maj7' },
  ],
};

const DEFAULT_TEMPO: Record<StringQuartetTextureArchetype, number> = {
  chorale: 72,
  arco_melody_accompaniment: 96,
  pad_suspension: 60,
  pizzicato_pulse: 132,
  tremolo_wash: 84,
  contrapuntal_weave: 108,
  duet_support: 120,
};

function resolveStringQuartetHarmonyRawBars(preset: StringQuartetMusicContextPreset): string[] {
  return barsFromHarmonyTemplate(preset.key, SQ_HARMONY_TEMPLATES[preset.textureArchetype]);
}

/** MusicContext snapshot from String Quartet preset; harmony normalised before checksum. */
export function buildMusicContextFromStringQuartet(
  preset: StringQuartetMusicContextPreset,
): MusicContext {
  const harmonyBars = resolveStringQuartetHarmonyRawBars(preset).map(normalizeChordSymbol);
  const harmony: MusicContextHarmony = {
    bars: harmonyBars,
    checksum: computeMusicContextChecksum(harmonyBars),
    source: 'generated',
  };
  const root = wybleEtudeKeyRootName(preset.key);
  const tempo = preset.tempo > 0 ? preset.tempo : DEFAULT_TEMPO[preset.textureArchetype];
  const roles = assignStringQuartetRoles(preset.seed);
  const realisedBars = solveStringQuartetVoiceLeading({
    harmonyBars,
    seed: preset.seed,
    texture: preset.textureArchetype,
    roles,
  });
  const diagnostics = computeStringQuartetRealisationDiagnostics(realisedBars, harmonyBars);

  return {
    schemaVersion: '1.0',
    seed: preset.seed,
    presetId: 'string_quartet',
    key: { root, mode: 'major' },
    meter: { beats: 4, beatType: 4 },
    bpm: tempo,
    totalBars: harmonyBars.length,
    harmony,
    provenance: {
      sourceEngineId: 'string_quartet',
      capturedAt: Date.now(),
      sourceRunId: String(preset.seed),
    },
    receipts: [
      {
        engine: 'string_quartet',
        kind: 'string_quartet_realisation_complete',
        payload: {
          textureArchetype: preset.textureArchetype,
          roles,
          tritonicFloatEnabled: tritonicFloatEnabled(preset.textureArchetype),
          barCount: harmonyBars.length,
          harmonyChecksum: harmony.checksum,
          bpm: tempo,
          ...diagnostics,
        },
      },
    ],
  };
}
