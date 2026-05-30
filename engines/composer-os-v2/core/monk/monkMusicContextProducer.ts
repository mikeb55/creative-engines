/**
 * Monk MusicContext producer (V105p5) — always-on, no feature flag.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import { buildMusicContextFromHarmonyBars } from '../music-context/harmonyBarsMusicContextShell';
import type { MusicContext } from '../music-context/musicContextTypes';
import { callMonkBridgeSync, type MonkBridgeResult } from './monkEngineBridge';

export type MonkMusicContextParams = {
  title: string;
  seed?: number;
  mode?: string;
  profile?: string;
  customChords?: string;
  bpm?: number;
};

export type MonkHarmonyParams = MonkMusicContextParams & {
  harmonyBars: readonly string[];
  metrics?: Pick<
    MonkBridgeResult,
    'chromaticNeighbourRate' | 'tritoneShiftCount' | 'rhythmicMotifConsistency' | 'dissonanceResolutionScore'
  >;
};

function receiptFromBridge(result: MonkBridgeResult): MusicContext['receipts'][number] {
  return {
    engine: 'monk',
    kind: 'monk_realisation_complete',
    payload: {
      title: result.title,
      profile: result.profile,
      form: result.form,
      barCount: result.barCount,
      seed: result.seed,
      tempo: result.tempo,
      chromaticNeighbourRate: result.chromaticNeighbourRate,
      tritoneShiftCount: result.tritoneShiftCount,
      rhythmicMotifConsistency: result.rhythmicMotifConsistency,
      dissonanceResolutionScore: result.dissonanceResolutionScore,
    },
  };
}

function defaultMonkMetrics(): Pick<
  MonkBridgeResult,
  'chromaticNeighbourRate' | 'tritoneShiftCount' | 'rhythmicMotifConsistency' | 'dissonanceResolutionScore'
> {
  return {
    chromaticNeighbourRate: 0,
    tritoneShiftCount: 0,
    rhythmicMotifConsistency: 0,
    dissonanceResolutionScore: 0.5,
  };
}

/** Build MusicContext from bridge harmony output (checksum after normalisation). */
export function buildMusicContextFromMonkBridgeResult(
  result: MonkBridgeResult,
  options?: { bpm?: number; seed?: number },
): MusicContext {
  if (!result.ok || result.harmonyBars.length === 0) {
    throw new Error(result.error ?? 'Monk bridge failed');
  }
  const harmonyBars = result.harmonyBars.map(normalizeChordSymbol);
  const ctx = buildMusicContextFromHarmonyBars({
    harmonyBars,
    sourceEngineId: 'monk',
    presetId: 'monk',
    seed: options?.seed ?? result.seed,
    bpm: options?.bpm ?? result.tempo,
    receipts: [receiptFromBridge({ ...result, barCount: harmonyBars.length })],
  });
  const expected = computeMusicContextChecksum(harmonyBars);
  if (ctx.harmony.checksum !== expected) {
    throw new Error('Monk harmony checksum mismatch after normalisation');
  }
  return ctx;
}

/** Deterministic path when harmony bars are already resolved (tests / section reuse). */
export function buildMusicContextFromMonkHarmony(params: MonkHarmonyParams): MusicContext {
  const harmonyBars = params.harmonyBars.map(normalizeChordSymbol);
  const metrics = params.metrics ?? defaultMonkMetrics();
  return buildMusicContextFromHarmonyBars({
    harmonyBars,
    sourceEngineId: 'monk',
    presetId: 'monk',
    seed: params.seed ?? 0,
    bpm: params.bpm ?? 120,
    receipts: [
      {
        engine: 'monk',
        kind: 'monk_realisation_complete',
        payload: {
          title: params.title,
          profile: params.profile ?? 'angular',
          barCount: harmonyBars.length,
          seed: params.seed ?? 0,
          tempo: params.bpm ?? 120,
          source: 'harmony_input',
          ...metrics,
        },
      },
    ],
  });
}

/** Full Python engine path → MusicContext. */
export function buildMusicContextFromMonk(params: MonkMusicContextParams): MusicContext {
  const bridge = callMonkBridgeSync({
    title: params.title,
    seed: params.seed,
    mode: params.mode,
    profile: params.profile,
    customChords: params.customChords,
  });
  return buildMusicContextFromMonkBridgeResult(bridge, {
    seed: params.seed,
    bpm: params.bpm,
  });
}
