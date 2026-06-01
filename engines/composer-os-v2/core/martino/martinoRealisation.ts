/**
 * Martino linear solo realisation — Python bridge + MusicContext (V107p4).
 */

import fs from 'node:fs';
import {
  computeMusicContextChecksum,
  inferKeyRootFromChordSymbols,
  normalizeKeyRoot,
} from '../music-context/musicContextAdapters';
import { buildMusicContextFromHarmonyBars } from '../music-context/harmonyBarsMusicContextShell';
import type { MusicContext } from '../music-context/musicContextTypes';
import { loopHarmonyBarsToLength } from '../solo/soloMusicContextExport';
import { buildMartinoTuneConfig, callMartinoEngineSync } from './martinoEngineBridge';

export type MartinoActivityRole =
  | 'linear_run'
  | 'guide_tone_lane'
  | 'chromatic_approach'
  | 'rhythmic_displacement';

export type MartinoPhraseLengthBias = 'short' | 'medium' | 'long';

export type MartinoRealisationPreset = {
  harmonyBars: readonly string[];
  totalBars?: number;
  seed?: number;
  bpm?: number;
  key?: string;
  activityStack?: readonly MartinoActivityRole[];
  /** 0–1 scalar — maps to LFV fret window centre (default 5–9). */
  lfv?: number;
  phraseLengthBias?: MartinoPhraseLengthBias;
  tuneName?: string;
};

export type MartinoRealisationResult = {
  musicContext: MusicContext;
  outputPath: string;
  xml: string;
};

const ACTIVITY_ROLE_TO_ID: Record<MartinoActivityRole, string> = {
  linear_run: 'A1_LINEAR_CORE',
  guide_tone_lane: 'A4_ANCHOR_ARP',
  chromatic_approach: 'A2_DIAGONAL_BRIDGE',
  rhythmic_displacement: 'A3_PIVOT_CELL',
};

function lfvWindowFromScalar(scalar: number | undefined): { min_fret: number; max_fret: number } {
  const t = scalar ?? 0.5;
  const min = Math.max(3, Math.round(5 + (t - 0.5) * 2));
  const max = Math.min(12, min + 4);
  return { min_fret: min, max_fret: max };
}

function martinoConfigFromPreset(preset: MartinoRealisationPreset): Record<string, unknown> {
  const stack = preset.activityStack ?? ['linear_run', 'guide_tone_lane', 'chromatic_approach', 'rhythmic_displacement'];
  const primary = ACTIVITY_ROLE_TO_ID[stack[0] ?? 'linear_run'] ?? 'A1_LINEAR_CORE';
  const secondary = stack.slice(1).map((r) => ACTIVITY_ROLE_TO_ID[r]).filter(Boolean);
  const lfv = lfvWindowFromScalar(preset.lfv);
  return {
    progression: loopHarmonyBarsToLength(preset.harmonyBars, preset.totalBars ?? preset.harmonyBars.length),
    activeActivity: primary,
    secondaryActivities: secondary,
    lfv,
    choruses: 1,
    tune: preset.tuneName ?? 'Orbit Solo',
    ...(preset.phraseLengthBias === 'long' ? { ecm_mode: 'METheny' } : {}),
    ...(preset.phraseLengthBias === 'short' ? { ecm_mode: 'SCHNEIDER' } : {}),
  };
}

/** Run Martino bridge and return MusicXML + MusicContext shell. */
export function realiseMartinoSolo(preset: MartinoRealisationPreset): MartinoRealisationResult {
  const totalBars = preset.totalBars ?? preset.harmonyBars.length;
  const harmonyBars = loopHarmonyBarsToLength(preset.harmonyBars, totalBars);
  const martinoConfig = martinoConfigFromPreset({ ...preset, totalBars });
  const section = {
    name: preset.tuneName ?? 'Orbit Solo',
    barCount: totalBars,
    meter: '4/4',
    key: preset.key ?? inferKeyRootFromChordSymbols(harmonyBars),
  };
  const tuneConfig = buildMartinoTuneConfig(section, martinoConfig);
  const bridge = callMartinoEngineSync(tuneConfig);
  if (!bridge.ok || !bridge.outputPath) {
    throw new Error(bridge.error ?? 'Martino bridge failed');
  }
  const xml = fs.readFileSync(bridge.outputPath, 'utf-8');
  const { root, mode } = normalizeKeyRoot(preset.key ?? inferKeyRootFromChordSymbols(harmonyBars));
  const checksum = computeMusicContextChecksum(harmonyBars);

  const musicContext: MusicContext = {
    ...buildMusicContextFromHarmonyBars({
      harmonyBars,
      sourceEngineId: 'martino',
      presetId: 'martino_linear',
      seed: preset.seed ?? 0,
      bpm: preset.bpm ?? 120,
      receipts: [
        {
          engine: 'martino',
          kind: 'martino_realisation_complete',
          payload: {
            outputPath: bridge.outputPath,
            activityStack: preset.activityStack ?? null,
            lfv: martinoConfig.lfv,
            phraseLengthBias: preset.phraseLengthBias ?? 'medium',
            barCount: totalBars,
            harmonyChecksum: checksum,
            readinessScore: bridge.readinessScore ?? null,
          },
        },
      ],
    }),
    key: { root, mode },
    totalBars,
    harmony: { bars: harmonyBars, checksum, source: 'martino_convert' },
  };

  return { musicContext, outputPath: bridge.outputPath, xml };
}

/** MusicContext from Martino linear preset (solo XML at {@link MartinoRealisationResult.outputPath}). */
export function buildMusicContextFromMartino(preset: MartinoRealisationPreset): MusicContext {
  return realiseMartinoSolo(preset).musicContext;
}
