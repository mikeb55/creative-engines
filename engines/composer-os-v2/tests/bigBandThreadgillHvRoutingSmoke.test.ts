/**
 * Phase 2 widen - BB Henry Threadgill HV-only non-mosaic harmony bridge.
 *
 * - HV=henry_threadgill: precompute fires, ht:* receipts, chordBars rewrite
 * - Primary henry_threadgill without HV: wall does NOT fire (HV-only)
 * - Soft HV id `threadgill`: wall does NOT fire
 * - Unwired HV (badalamenti): chord parity with baseline; berg/beefheart/fela zero Threadgill
 * - frank_zappa primary: Threadgill wall skipped
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import {
  buildHenryThreadgillEnsemblePrecomputeContext,
  isHenryThreadgillHvOnlyEnsembleWall,
  precomputeHenryThreadgillEffectiveHarmonyBars,
} from '../core/song-mode/henryThreadgillSlice';

function bbCtx(opts: { primary: string; harmonicVoice?: string }): CompositionContext {
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: opts.primary,
    ...(opts.harmonicVoice ? { harmonicVoice: opts.harmonicVoice } : {}),
  };
  return {
    systemVersion: '2.0.0',
    presetId: 'big_band',
    seed: 96091,
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
    seed: opts.seed ?? 96091,
    title: 'BB Threadgill HV smoke',
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
    isHenryThreadgillHvOnlyEnsembleWall({
      harmonicVoice: 'henry_threadgill',
      songwriterStyleId: 'wayne_shorter',
    }) === true &&
    isHenryThreadgillHvOnlyEnsembleWall({
      harmonicVoice: undefined,
      songwriterStyleId: 'henry_threadgill',
    }) === false &&
    isHenryThreadgillHvOnlyEnsembleWall({
      harmonicVoice: 'threadgill',
      songwriterStyleId: 'wayne_shorter',
    }) === false &&
    isHenryThreadgillHvOnlyEnsembleWall({
      harmonicVoice: 'henry_threadgill',
      songwriterStyleId: 'frank_zappa',
    }) === false &&
    isHenryThreadgillHvOnlyEnsembleWall({
      harmonicVoice: 'berg',
      songwriterStyleId: 'wayne_shorter',
    }) === false &&
    isHenryThreadgillHvOnlyEnsembleWall({
      harmonicVoice: 'fela_kuti',
      songwriterStyleId: 'wayne_shorter',
    }) === false
  );
}

function testBuilderPrecomputeRewrites(): boolean {
  const bars = [...Array(16).fill('Cmaj7')] as string[];
  const ctx = buildHenryThreadgillEnsemblePrecomputeContext({
    seed: 96091,
    chordBars: bars,
    sections: [{ label: 'A', startBar: 1, length: 16 }],
    presetId: 'big_band',
    songwriterStyleId: 'wayne_shorter',
  });
  precomputeHenryThreadgillEffectiveHarmonyBars(ctx);
  const meta = ctx.generationMetadata as GenerationMetadata & {
    henryThreadgillEffectiveHarmonyBars?: string[];
    henryThreadgillDeviceReceipts?: string[];
  };
  const out = meta.henryThreadgillEffectiveHarmonyBars ?? [];
  const receipts = meta.henryThreadgillDeviceReceipts ?? [];
  return (
    out.length === 16 &&
    receipts.some((r) => r.startsWith('ht:')) &&
    receipts.some((r) => r.includes('ht:params=') || r.startsWith('ht:episode'))
  );
}

function testHvThreadgillFires(): boolean {
  const r = realise({ primary: 'wayne_shorter', harmonicVoice: 'henry_threadgill' });
  const receipts = r.henryThreadgillDeviceReceipts ?? [];
  return receipts.some((x) => x.startsWith('ht:')) && scoreChords(r.score).length > 0;
}

function testPrimaryThreadgillNoHvUnchanged(): boolean {
  const a = realise({ primary: 'henry_threadgill' });
  const b = realise({ primary: 'wayne_shorter' });
  if ((a.henryThreadgillDeviceReceipts?.length ?? 0) !== 0) return false;
  return scoreChords(a.score) === scoreChords(b.score);
}

function testSpotCheckOtherHvZeroThreadgill(): boolean {
  const baseline = realise({ primary: 'wayne_shorter' });
  const berg = realise({ primary: 'wayne_shorter', harmonicVoice: 'berg' });
  const beef = realise({ primary: 'wayne_shorter', harmonicVoice: 'beefheart' });
  const fela = realise({ primary: 'wayne_shorter', harmonicVoice: 'fela_kuti' });
  const badalamenti = realise({ primary: 'wayne_shorter', harmonicVoice: 'angelo_badalamenti' });
  if ((berg.henryThreadgillDeviceReceipts?.length ?? 0) !== 0) return false;
  if ((beef.henryThreadgillDeviceReceipts?.length ?? 0) !== 0) return false;
  if ((fela.henryThreadgillDeviceReceipts?.length ?? 0) !== 0) return false;
  if ((badalamenti.henryThreadgillDeviceReceipts?.length ?? 0) !== 0) return false;
  const bc = scoreChords(baseline.score);
  return (
    scoreChords(berg.score).length > 0 &&
    scoreChords(beef.score).length > 0 &&
    scoreChords(fela.score).length > 0 &&
    bc === scoreChords(badalamenti.score) &&
    bc.length > 0
  );
}

function testFzPrimarySkipsThreadgillWall(): boolean {
  const r = realise({ primary: 'frank_zappa', harmonicVoice: 'henry_threadgill', bars: 16 });
  return (r.henryThreadgillDeviceReceipts?.length ?? 0) === 0;
}

export function runBigBandThreadgillHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'BB Threadgill HV: isHenryThreadgillHvOnlyEnsembleWall gate (HV-only, FZ excluded, soft no)',
      ok: testGateHvOnly(),
    },
    {
      name: 'BB Threadgill HV: buildHenryThreadgillEnsemblePrecomputeContext + ht:* receipts',
      ok: testBuilderPrecomputeRewrites(),
    },
    {
      name: 'BB Threadgill HV: HV=henry_threadgill fires wall + ht:* receipts',
      ok: testHvThreadgillFires(),
    },
    {
      name: 'BB Threadgill HV: primary henry_threadgill without HV does not fire wall',
      ok: testPrimaryThreadgillNoHvUnchanged(),
    },
    {
      name: 'BB Threadgill HV: berg/beefheart/fela/badalamenti HV spot-check - zero Threadgill rewrite',
      ok: testSpotCheckOtherHvZeroThreadgill(),
    },
    {
      name: 'BB Threadgill HV: frank_zappa primary + HV=henry_threadgill skips Threadgill wall',
      ok: testFzPrimarySkipsThreadgillWall(),
    },
  ];
}
