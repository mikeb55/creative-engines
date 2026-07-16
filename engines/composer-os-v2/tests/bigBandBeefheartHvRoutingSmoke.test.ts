/**
 * Phase 2 widen — BB Beefheart HV-only non-mosaic harmony bridge.
 *
 * - HV=beefheart: precompute fires, cbf:* receipts, chordBars rewrite
 * - Primary beefheart without HV: wall does NOT fire (HV-only)
 * - Twin / soft HV ids: wall does NOT fire
 * - Unwired HV (berg / badalamenti): zero Beefheart rewrite
 * - frank_zappa primary: Beefheart wall skipped
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import {
  buildBeefheartEnsemblePrecomputeContext,
  isBeefheartHvOnlyEnsembleWall,
  precomputeBeefheartEffectiveHarmonyBars,
} from '../core/song-mode/beefheartFragmentSlice';

function bbCtx(opts: { primary: string; harmonicVoice?: string }): CompositionContext {
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: opts.primary,
    ...(opts.harmonicVoice ? { harmonicVoice: opts.harmonicVoice } : {}),
  };
  return {
    systemVersion: '2.0.0',
    presetId: 'big_band',
    seed: 96071,
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
    seed: opts.seed ?? 96071,
    title: 'BB Beefheart HV smoke',
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
    isBeefheartHvOnlyEnsembleWall({
      harmonicVoice: 'beefheart',
      songwriterStyleId: 'wayne_shorter',
    }) === true &&
    isBeefheartHvOnlyEnsembleWall({ harmonicVoice: undefined, songwriterStyleId: 'beefheart' }) ===
      false &&
    isBeefheartHvOnlyEnsembleWall({
      harmonicVoice: 'captain_beefheart',
      songwriterStyleId: 'wayne_shorter',
    }) === false &&
    isBeefheartHvOnlyEnsembleWall({
      harmonicVoice: 'beefheart_fragment_polyphony',
      songwriterStyleId: 'wayne_shorter',
    }) === false &&
    isBeefheartHvOnlyEnsembleWall({
      harmonicVoice: 'beefheart',
      songwriterStyleId: 'frank_zappa',
    }) === false &&
    isBeefheartHvOnlyEnsembleWall({
      harmonicVoice: 'berg',
      songwriterStyleId: 'wayne_shorter',
    }) === false
  );
}

function testBuilderPrecomputeRewrites(): boolean {
  const bars = [...Array(16).fill('Cmaj7')] as string[];
  const ctx = buildBeefheartEnsemblePrecomputeContext({
    seed: 96071,
    chordBars: bars,
    sections: [{ label: 'A', startBar: 1, length: 16 }],
    presetId: 'big_band',
    songwriterStyleId: 'wayne_shorter',
  });
  precomputeBeefheartEffectiveHarmonyBars(ctx);
  const meta = ctx.generationMetadata as GenerationMetadata & {
    beefheartEffectiveHarmonyBars?: string[];
    beefheartDeviceReceipts?: string[];
  };
  const out = meta.beefheartEffectiveHarmonyBars ?? [];
  const receipts = meta.beefheartDeviceReceipts ?? [];
  return (
    out.length === 16 &&
    out.join('|') !== bars.join('|') &&
    receipts.some((r) => r.startsWith('cbf:'))
  );
}

function testHvBeefheartFires(): boolean {
  const r = realise({ primary: 'wayne_shorter', harmonicVoice: 'beefheart' });
  const receipts = r.beefheartDeviceReceipts ?? [];
  return receipts.some((x) => x.startsWith('cbf:')) && scoreChords(r.score).length > 0;
}

function testPrimaryBeefheartNoHvUnchanged(): boolean {
  const a = realise({ primary: 'beefheart' });
  const b = realise({ primary: 'wayne_shorter' });
  if ((a.beefheartDeviceReceipts?.length ?? 0) !== 0) return false;
  return scoreChords(a.score) === scoreChords(b.score);
}

function testSpotCheckOtherHvZeroBeefheart(): boolean {
  const baseline = realise({ primary: 'wayne_shorter' });
  const berg = realise({ primary: 'wayne_shorter', harmonicVoice: 'berg' });
  const badalamenti = realise({ primary: 'wayne_shorter', harmonicVoice: 'angelo_badalamenti' });
  if ((berg.beefheartDeviceReceipts?.length ?? 0) !== 0) return false;
  if ((badalamenti.beefheartDeviceReceipts?.length ?? 0) !== 0) return false;
  const bc = scoreChords(baseline.score);
  // Berg HV rewrites chords (Batch 6); Badalamenti still unwired → chord parity with baseline.
  return scoreChords(berg.score).length > 0 && bc === scoreChords(badalamenti.score) && bc.length > 0;
}

function testFzPrimarySkipsBeefheartWall(): boolean {
  const r = realise({ primary: 'frank_zappa', harmonicVoice: 'beefheart', bars: 16 });
  return (r.beefheartDeviceReceipts?.length ?? 0) === 0;
}

export function runBigBandBeefheartHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'BB Beefheart HV: isBeefheartHvOnlyEnsembleWall gate (HV-only, FZ excluded, twin/soft no)',
      ok: testGateHvOnly(),
    },
    {
      name: 'BB Beefheart HV: buildBeefheartEnsemblePrecomputeContext + precompute rewrites bars',
      ok: testBuilderPrecomputeRewrites(),
    },
    {
      name: 'BB Beefheart HV: HV=beefheart fires wall + cbf:* receipts',
      ok: testHvBeefheartFires(),
    },
    {
      name: 'BB Beefheart HV: primary beefheart without HV does not fire wall',
      ok: testPrimaryBeefheartNoHvUnchanged(),
    },
    {
      name: 'BB Beefheart HV: berg/badalamenti HV spot-check - zero Beefheart rewrite',
      ok: testSpotCheckOtherHvZeroBeefheart(),
    },
    {
      name: 'BB Beefheart HV: frank_zappa primary + HV=beefheart skips Beefheart wall',
      ok: testFzPrimarySkipsBeefheartWall(),
    },
  ];
}