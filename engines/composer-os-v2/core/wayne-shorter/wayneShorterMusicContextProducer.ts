/**
 * Wayne Shorter MusicContext producer (V104p7) — always-on, no feature flag.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import { buildMusicContextFromHarmonyBars } from '../music-context/harmonyBarsMusicContextShell';
import type { MusicContext } from '../music-context/musicContextTypes';
import {
  callWayneShorterBridgeSync,
  type WayneShorterBridgeResult,
} from './wayneShorterEngineBridge';

export type WayneShorterMusicContextParams = {
  title: string;
  seed?: number;
  mode?: string;
  profile?: string;
  customChords?: string;
  bpm?: number;
};

export type WayneShorterHarmonyParams = WayneShorterMusicContextParams & {
  harmonyBars: readonly string[];
};

function receiptFromBridge(result: WayneShorterBridgeResult): MusicContext['receipts'][number] {
  return {
    engine: 'wayne_shorter',
    kind: 'wayne_shorter_realisation_complete',
    payload: {
      title: result.title,
      profile: result.profile,
      form: result.form,
      barCount: result.barCount,
      seed: result.seed,
      tempo: result.tempo,
    },
  };
}

/** Build MusicContext from bridge harmony output (checksum after normalisation). */
export function buildMusicContextFromWayneShorterBridgeResult(
  result: WayneShorterBridgeResult,
  options?: { bpm?: number; seed?: number },
): MusicContext {
  if (!result.ok || result.harmonyBars.length === 0) {
    throw new Error(result.error ?? 'Wayne Shorter bridge failed');
  }
  const harmonyBars = result.harmonyBars.map(normalizeChordSymbol);
  const ctx = buildMusicContextFromHarmonyBars({
    harmonyBars,
    sourceEngineId: 'wayne_shorter',
    presetId: 'wayne_shorter',
    seed: options?.seed ?? result.seed,
    bpm: options?.bpm ?? result.tempo,
    receipts: [receiptFromBridge({ ...result, barCount: harmonyBars.length })],
  });
  const expected = computeMusicContextChecksum(harmonyBars);
  if (ctx.harmony.checksum !== expected) {
    throw new Error('Wayne Shorter harmony checksum mismatch after normalisation');
  }
  return ctx;
}

/** Deterministic path when harmony bars are already resolved (tests / section reuse). */
export function buildMusicContextFromWayneShorterHarmony(
  params: WayneShorterHarmonyParams,
): MusicContext {
  const harmonyBars = params.harmonyBars.map(normalizeChordSymbol);
  return buildMusicContextFromHarmonyBars({
    harmonyBars,
    sourceEngineId: 'wayne_shorter',
    presetId: 'wayne_shorter',
    seed: params.seed ?? 0,
    bpm: params.bpm ?? 96,
    receipts: [
      {
        engine: 'wayne_shorter',
        kind: 'wayne_shorter_realisation_complete',
        payload: {
          title: params.title,
          profile: params.profile ?? 'balanced',
          barCount: harmonyBars.length,
          seed: params.seed ?? 0,
          tempo: params.bpm ?? 96,
          source: 'harmony_input',
        },
      },
    ],
  });
}

/** Full Python engine path → MusicContext. */
export function buildMusicContextFromWayneShorter(
  params: WayneShorterMusicContextParams,
): MusicContext {
  const bridge = callWayneShorterBridgeSync({
    title: params.title,
    seed: params.seed,
    mode: params.mode,
    profile: params.profile,
    customChords: params.customChords,
  });
  return buildMusicContextFromWayneShorterBridgeResult(bridge, {
    seed: params.seed,
    bpm: params.bpm,
  });
}
