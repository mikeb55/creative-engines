/**
 * Phase 2 widen - BB Eberhard Weber HV-only non-mosaic harmony bridge (final ROI #5).
 *
 * - HV=eberhard_weber: precompute fires, ew:* receipts, chordBars rewrite
 * - Primary eberhard_weber without HV: wall does NOT fire (HV-only)
 * - Twin weber_field / soft weber: wall does NOT fire
 * - Unwired HV (angelo_badalamenti): chord parity with baseline
 * - frank_zappa primary: Weber wall skipped
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import {
  buildEberhardWeberEnsemblePrecomputeContext,
  isEberhardWeberHvOnlyEnsembleWall,
  precomputeEberhardWeberEffectiveHarmonyBars,
} from '../core/song-mode/weberFieldSlice';

function bbCtx(opts: { primary: string; harmonicVoice?: string }): CompositionContext {
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: opts.primary,
    ...(opts.harmonicVoice ? { harmonicVoice: opts.harmonicVoice } : {}),
  };
  return {
    systemVersion: '2.0.0',
    presetId: 'big_band',
    seed: 96101,
    form: { totalBars: 16, sections: [{ label: 'A', startBar: 1, length: 16 }] },
    generationMetadata,
  } as CompositionContext;
}

function scoreChords(score: ScoreModel | undefined): string {
  if (!score?.parts?.length) return '';
  const part = score.parts[0]!;
  return (part.measures ?? [])
    .map((m) => String(m.chord ?? m.chordSymbol ?? '').trim())
    .join('|');
}

function realise(opts: {
  primary: string;
  harmonicVoice?: string;
  seed?: number;
  bars?: number;
}): ReturnType<typeof runBigBandRealisation> {
  const bars = opts.bars ?? 16;
  const chords = [...Array(bars).fill('Cmaj7')] as string[];
  return runBigBandRealisation({
    seed: opts.seed ?? 96101,
    title: 'BB Weber HV smoke',
    totalBars: bars,
    ensembleConfigId: 'full_band',
    stylePairing: {
      songwriterStyle: opts.primary,
      arrangerStyle: 'thad',
      era: 'swing',
    },
    era: 'swing',
    songwriterStyleId: opts.primary,
    chordProgressionText: chords.join(' | '),
    context: bbCtx({ primary: opts.primary, harmonicVoice: opts.harmonicVoice }),
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
      harmonicVoice: 'weber_field',
      songwriterStyleId: 'wayne_shorter',
    }) === false &&
    isEberhardWeberHvOnlyEnsembleWall({
      harmonicVoice: 'weber',
      songwriterStyleId: 'wayne_shorter',
    }) === false &&
    isEberhardWeberHvOnlyEnsembleWall({
      harmonicVoice: 'webern',
      songwriterStyleId: 'wayne_shorter',
    }) === false &&
    isEberhardWeberHvOnlyEnsembleWall({
      harmonicVoice: 'eberhard_weber',
      songwriterStyleId: 'frank_zappa',
    }) === false &&
    isEberhardWeberHvOnlyEnsembleWall({
      harmonicVoice: 'henry_threadgill',
      songwriterStyleId: 'wayne_shorter',
    }) === false
  );
}

function testBuilderPrecomputeRewrites(): boolean {
  const bars = [...Array(16).fill('Cmaj7')] as string[];
  const ctx = buildEberhardWeberEnsemblePrecomputeContext({
    seed: 96101,
    chordBars: bars,
    sections: [{ label: 'A', startBar: 1, length: 16 }],
    presetId: 'big_band',
    songwriterStyleId: 'wayne_shorter',
  });
  precomputeEberhardWeberEffectiveHarmonyBars(ctx);
  const meta = ctx.generationMetadata as GenerationMetadata & {
    eberhardWeberEffectiveHarmonyBars?: string[];
    eberhardWeberDeviceReceipts?: string[];
  };
  const out = meta.eberhardWeberEffectiveHarmonyBars ?? [];
  const receipts = meta.eberhardWeberDeviceReceipts ?? [];
  return (
    out.length === 16 &&
    receipts.some((r) => r.startsWith('ew:')) &&
    receipts.some((r) => r.startsWith('ew:params='))
  );
}

function testHvWeberFires(): boolean {
  const r = realise({ primary: 'wayne_shorter', harmonicVoice: 'eberhard_weber' });
  const receipts = r.eberhardWeberDeviceReceipts ?? [];
  return receipts.some((x) => x.startsWith('ew:')) && scoreChords(r.score).length > 0;
}

function testPrimaryWeberNoHvUnchanged(): boolean {
  const a = realise({ primary: 'eberhard_weber' });
  const b = realise({ primary: 'wayne_shorter' });
  if ((a.eberhardWeberDeviceReceipts?.length ?? 0) !== 0) return false;
  return scoreChords(a.score) === scoreChords(b.score);
}

function testSpotCheckOtherHvZeroWeber(): boolean {
  const baseline = realise({ primary: 'wayne_shorter' });
  const berg = realise({ primary: 'wayne_shorter', harmonicVoice: 'berg' });
  const thr = realise({ primary: 'wayne_shorter', harmonicVoice: 'henry_threadgill' });
  const fela = realise({ primary: 'wayne_shorter', harmonicVoice: 'fela_kuti' });
  const badalamenti = realise({ primary: 'wayne_shorter', harmonicVoice: 'angelo_badalamenti' });
  if ((berg.eberhardWeberDeviceReceipts?.length ?? 0) !== 0) return false;
  if ((thr.eberhardWeberDeviceReceipts?.length ?? 0) !== 0) return false;
  if ((fela.eberhardWeberDeviceReceipts?.length ?? 0) !== 0) return false;
  if ((badalamenti.eberhardWeberDeviceReceipts?.length ?? 0) !== 0) return false;
  const bc = scoreChords(baseline.score);
  return (
    scoreChords(berg.score).length > 0 &&
    scoreChords(thr.score).length > 0 &&
    scoreChords(fela.score).length > 0 &&
    bc === scoreChords(badalamenti.score) &&
    bc.length > 0
  );
}

function testFzPrimarySkipsWeberWall(): boolean {
  const r = realise({ primary: 'frank_zappa', harmonicVoice: 'eberhard_weber', bars: 16 });
  return (r.eberhardWeberDeviceReceipts?.length ?? 0) === 0;
}

export function runBigBandWeberHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'BB Weber HV: isEberhardWeberHvOnlyEnsembleWall gate (HV-only, FZ excluded, twin/soft no)',
      ok: testGateHvOnly(),
    },
    {
      name: 'BB Weber HV: buildEberhardWeberEnsemblePrecomputeContext + ew:* receipts',
      ok: testBuilderPrecomputeRewrites(),
    },
    {
      name: 'BB Weber HV: HV=eberhard_weber fires wall + ew:* receipts',
      ok: testHvWeberFires(),
    },
    {
      name: 'BB Weber HV: primary eberhard_weber without HV does not fire wall',
      ok: testPrimaryWeberNoHvUnchanged(),
    },
    {
      name: 'BB Weber HV: berg/threadgill/fela/badalamenti HV spot-check - zero Weber rewrite',
      ok: testSpotCheckOtherHvZeroWeber(),
    },
    {
      name: 'BB Weber HV: frank_zappa primary + HV=eberhard_weber skips Weber wall',
      ok: testFzPrimarySkipsWeberWall(),
    },
  ];
}
