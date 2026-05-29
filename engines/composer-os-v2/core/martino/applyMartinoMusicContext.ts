/**
 * Martino tune_config — MusicContext consumer (V90a, feature-flagged).
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { harmonyBarsFromMusicContext } from '../music-context/musicContextAdapters';
import type { MusicContext } from '../music-context/musicContextTypes';

const martinoRequire = createRequire(__filename);

const { convert_progression } = martinoRequire(
  path.resolve(__dirname, '../../../../src/engine/martinoConvert.js')
) as {
  convert_progression: (
    chords: string[],
    tensionMap?: Record<number, 'low' | 'medium' | 'high'>
  ) => Array<{ minorRoot: string }>;
};

export function isMartinoMusicContextEnabled(): boolean {
  return process.env.MARTINO_MUSIC_CONTEXT === 'true';
}

function tensionMapFromMartinoConfig(
  martinoConfig: Record<string, unknown>
): Record<number, 'low' | 'medium' | 'high'> {
  const map: Record<number, 'low' | 'medium' | 'high'> = {};
  const raw = martinoConfig.perChordOverrides ?? martinoConfig.tension_map ?? {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const idx = Number(k);
      if (Number.isFinite(idx) && (v === 'low' || v === 'medium' || v === 'high')) {
        map[idx] = v;
      }
    }
  }
  return map;
}

function chordsWithMinorRootConversion(
  harmonyBars: string[],
  martinoConfig: Record<string, unknown>
): string[] {
  const tensionMap = tensionMapFromMartinoConfig(martinoConfig);
  return convert_progression(harmonyBars, tensionMap).map((row) => row.minorRoot);
}

export function applyMartinoMusicContextToTuneConfig(
  tuneConfig: Record<string, unknown>,
  musicContext: MusicContext | null | undefined,
  martinoConfig: Record<string, unknown> = {}
): Record<string, unknown> {
  if (!isMartinoMusicContextEnabled() || !musicContext) {
    return tuneConfig;
  }
  if (musicContext.harmony.bars.length === 0) {
    return tuneConfig;
  }

  const harmonyBars = harmonyBarsFromMusicContext(musicContext);
  tuneConfig.chords = chordsWithMinorRootConversion(harmonyBars, martinoConfig);

  if (musicContext.motif) {
    tuneConfig.music_context_motif_hint = {
      interval_pattern: [...musicContext.motif.intervalPattern],
      contour_pattern: [...musicContext.motif.contourPattern],
      anchor_midi: musicContext.motif.anchorMidi ?? null,
    };
  }

  return tuneConfig;
}
