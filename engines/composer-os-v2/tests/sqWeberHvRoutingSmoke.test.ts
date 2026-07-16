/**
 * Phase 2 widen - SQ Eberhard Weber HV-only non-mosaic harmony bridge (final ROI #5).
 *
 * - HV=eberhard_weber: precompute fires, eberhardWeberDeviceReceipts / effective bars on meta
 * - Primary eberhard_weber without HV: wall does NOT fire
 * - Unwired HV (angelo_badalamenti): chord parity with baseline
 */

import type { GenerationMetadata } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';
import { isEberhardWeberHvOnlyEnsembleWall } from '../core/song-mode/weberFieldSlice';

function scoreChords(score: ScoreModel | undefined): string {
  if (!score?.parts?.length) return '';
  const part = score.parts[0]!;
  return (part.measures ?? [])
    .map((m) => String(m.chord ?? m.chordSymbol ?? '').trim())
    .join('|');
}

function weberReceipts(r: ReturnType<typeof runQuartetRealisation>): string[] {
  const meta = r.ensembleHarmonyMetadata as
    | (GenerationMetadata & { eberhardWeberDeviceReceipts?: string[] })
    | undefined;
  return meta?.eberhardWeberDeviceReceipts ?? [];
}

function realise(opts: {
  primary: string;
  harmonicVoice?: string;
  seed?: number;
  bars?: number;
}): ReturnType<typeof runQuartetRealisation> {
  const bars = opts.bars ?? 16;
  const chords = [...Array(bars).fill('Cmaj7')] as string[];
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: opts.primary,
    ...(opts.harmonicVoice ? { harmonicVoice: opts.harmonicVoice } : {}),
  };
  return runQuartetRealisation({
    seed: opts.seed ?? 96102,
    title: 'SQ Weber HV smoke',
    totalBars: bars,
    songwriterStyleId: opts.primary,
    chordProgressionText: chords.join(' | '),
    generationMetadata,
  });
}

function testGateHvOnly(): boolean {
  return (
    isEberhardWeberHvOnlyEnsembleWall({
      harmonicVoice: 'eberhard_weber',
      songwriterStyleId: 'wayne_shorter',
    }) === true &&
    isEberhardWeberHvOnlyEnsembleWall({
      harmonicVoice: undefined,
      songwriterStyleId: 'eberhard_weber',
    }) === false &&
    isEberhardWeberHvOnlyEnsembleWall({
      harmonicVoice: 'eberhard_weber',
      songwriterStyleId: 'frank_zappa',
    }) === false
  );
}

function testHvWeberFires(): boolean {
  const r = realise({ primary: 'wayne_shorter', harmonicVoice: 'eberhard_weber' });
  if (!r.score) return false;
  const meta = r.ensembleHarmonyMetadata as
    | (GenerationMetadata & {
        eberhardWeberEffectiveHarmonyBars?: string[];
        eberhardWeberDeviceReceipts?: string[];
      })
    | undefined;
  const bars = meta?.eberhardWeberEffectiveHarmonyBars ?? [];
  const receipts = weberReceipts(r);
  return (
    meta?.harmonicVoice === 'eberhard_weber' &&
    bars.length === 16 &&
    receipts.some((x) => x.startsWith('ew:'))
  );
}

function testPrimaryWeberNoHv(): boolean {
  const r = realise({ primary: 'eberhard_weber' });
  return weberReceipts(r).length === 0;
}

function testSpotCheckOtherHv(): boolean {
  const baseline = realise({ primary: 'wayne_shorter' });
  const berg = realise({ primary: 'wayne_shorter', harmonicVoice: 'berg' });
  const thr = realise({ primary: 'wayne_shorter', harmonicVoice: 'henry_threadgill' });
  const fela = realise({ primary: 'wayne_shorter', harmonicVoice: 'fela_kuti' });
  const badalamenti = realise({ primary: 'wayne_shorter', harmonicVoice: 'angelo_badalamenti' });
  if (
    weberReceipts(berg).length !== 0 ||
    weberReceipts(thr).length !== 0 ||
    weberReceipts(fela).length !== 0 ||
    weberReceipts(badalamenti).length !== 0
  ) {
    return false;
  }
  const bc = scoreChords(baseline.score);
  return (
    scoreChords(berg.score).length > 0 &&
    scoreChords(thr.score).length > 0 &&
    scoreChords(fela.score).length > 0 &&
    bc === scoreChords(badalamenti.score) &&
    bc.length > 0
  );
}

export function runSqWeberHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'SQ Weber HV: isEberhardWeberHvOnlyEnsembleWall gate',
      ok: testGateHvOnly(),
    },
    {
      name: 'SQ Weber HV: HV=eberhard_weber fires wall + ew:* / effective bars',
      ok: testHvWeberFires(),
    },
    {
      name: 'SQ Weber HV: primary eberhard_weber without HV does not fire wall',
      ok: testPrimaryWeberNoHv(),
    },
    {
      name: 'SQ Weber HV: berg/threadgill/fela/badalamenti HV spot-check - zero Weber rewrite',
      ok: testSpotCheckOtherHv(),
    },
  ];
}
