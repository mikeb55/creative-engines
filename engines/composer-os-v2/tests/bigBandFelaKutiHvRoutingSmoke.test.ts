/**
 * Phase 2 widen - BB Fela Kuti HV-only non-mosaic harmony bridge.
 *
 * - HV=fela_kuti: precompute fires, fk:* receipts, chordBars rewrite (incl. fBT final bias)
 * - Primary fela_kuti without HV: wall does NOT fire (HV-only)
 * - Soft HV id `fela`: wall does NOT fire
 * - Unwired HV (berg / badalamenti): zero Fela rewrite
 * - frank_zappa primary: Fela wall skipped
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import {
  buildFelaKutiEnsemblePrecomputeContext,
  isFelaKutiHvOnlyEnsembleWall,
  precomputeFelaKutiEffectiveHarmonyBars,
} from '../core/song-mode/felaKutiSlice';

function bbCtx(opts: { primary: string; harmonicVoice?: string }): CompositionContext {
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: opts.primary,
    ...(opts.harmonicVoice ? { harmonicVoice: opts.harmonicVoice } : {}),
  };
  return {
    systemVersion: '2.0.0',
    presetId: 'big_band',
    seed: 96081,
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
  const chords = [...Array(Math.max(0, bars - 1)).fill('Cmaj7'), 'G7'] as string[];
  return runBigBandRealisation({
    seed: opts.seed ?? 96081,
    title: 'BB Fela Kuti HV smoke',
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
    isFelaKutiHvOnlyEnsembleWall({
      harmonicVoice: 'fela_kuti',
      songwriterStyleId: 'wayne_shorter',
    }) === true &&
    isFelaKutiHvOnlyEnsembleWall({ harmonicVoice: undefined, songwriterStyleId: 'fela_kuti' }) ===
      false &&
    isFelaKutiHvOnlyEnsembleWall({
      harmonicVoice: 'fela',
      songwriterStyleId: 'wayne_shorter',
    }) === false &&
    isFelaKutiHvOnlyEnsembleWall({
      harmonicVoice: 'fela_kuti',
      songwriterStyleId: 'frank_zappa',
    }) === false &&
    isFelaKutiHvOnlyEnsembleWall({
      harmonicVoice: 'berg',
      songwriterStyleId: 'wayne_shorter',
    }) === false &&
    isFelaKutiHvOnlyEnsembleWall({
      harmonicVoice: 'beefheart',
      songwriterStyleId: 'wayne_shorter',
    }) === false
  );
}

function testBuilderPrecomputeRewrites(): boolean {
  const bars = [...Array(15).fill('Cmaj7'), 'G7'] as string[];
  const ctx = buildFelaKutiEnsemblePrecomputeContext({
    seed: 96081,
    chordBars: bars,
    sections: [{ label: 'A', startBar: 1, length: 16 }],
    presetId: 'big_band',
    songwriterStyleId: 'wayne_shorter',
  });
  precomputeFelaKutiEffectiveHarmonyBars(ctx);
  const meta = ctx.generationMetadata as GenerationMetadata & {
    felaKutiEffectiveHarmonyBars?: string[];
    felaKutiDeviceReceipts?: string[];
  };
  const out = meta.felaKutiEffectiveHarmonyBars ?? [];
  const receipts = meta.felaKutiDeviceReceipts ?? [];
  const finalOk = out[15] === 'Cmin7' || out[15] === 'Cmin9';
  return (
    out.length === 16 &&
    finalOk &&
    receipts.some((r) => r.startsWith('fk:')) &&
    receipts.some((r) => r.includes('final_vamp_bias'))
  );
}

function testHvFelaFires(): boolean {
  const r = realise({ primary: 'wayne_shorter', harmonicVoice: 'fela_kuti' });
  const receipts = r.felaKutiDeviceReceipts ?? [];
  return receipts.some((x) => x.startsWith('fk:')) && scoreChords(r.score).length > 0;
}

function testPrimaryFelaNoHvUnchanged(): boolean {
  const a = realise({ primary: 'fela_kuti' });
  const b = realise({ primary: 'wayne_shorter' });
  if ((a.felaKutiDeviceReceipts?.length ?? 0) !== 0) return false;
  return scoreChords(a.score) === scoreChords(b.score);
}

function testSpotCheckOtherHvZeroFela(): boolean {
  const baseline = realise({ primary: 'wayne_shorter' });
  const berg = realise({ primary: 'wayne_shorter', harmonicVoice: 'berg' });
  const beef = realise({ primary: 'wayne_shorter', harmonicVoice: 'beefheart' });
  const badalamenti = realise({ primary: 'wayne_shorter', harmonicVoice: 'angelo_badalamenti' });
  if ((berg.felaKutiDeviceReceipts?.length ?? 0) !== 0) return false;
  if ((beef.felaKutiDeviceReceipts?.length ?? 0) !== 0) return false;
  if ((badalamenti.felaKutiDeviceReceipts?.length ?? 0) !== 0) return false;
  const bc = scoreChords(baseline.score);
  return (
    scoreChords(berg.score).length > 0 &&
    scoreChords(beef.score).length > 0 &&
    bc === scoreChords(badalamenti.score) &&
    bc.length > 0
  );
}

function testFzPrimarySkipsFelaWall(): boolean {
  const r = realise({ primary: 'frank_zappa', harmonicVoice: 'fela_kuti', bars: 16 });
  return (r.felaKutiDeviceReceipts?.length ?? 0) === 0;
}

export function runBigBandFelaKutiHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'BB Fela HV: isFelaKutiHvOnlyEnsembleWall gate (HV-only, FZ excluded, soft no)',
      ok: testGateHvOnly(),
    },
    {
      name: 'BB Fela HV: buildFelaKutiEnsemblePrecomputeContext + fBT final bias',
      ok: testBuilderPrecomputeRewrites(),
    },
    {
      name: 'BB Fela HV: HV=fela_kuti fires wall + fk:* receipts',
      ok: testHvFelaFires(),
    },
    {
      name: 'BB Fela HV: primary fela_kuti without HV does not fire wall',
      ok: testPrimaryFelaNoHvUnchanged(),
    },
    {
      name: 'BB Fela HV: berg/beefheart/badalamenti HV spot-check - zero Fela rewrite',
      ok: testSpotCheckOtherHvZeroFela(),
    },
    {
      name: 'BB Fela HV: frank_zappa primary + HV=fela_kuti skips Fela wall',
      ok: testFzPrimarySkipsFelaWall(),
    },
  ];
}
