/**
 * Phase 2 Batch 4 — BB FZ precompute HV continuity (pure routing; gate stays primary).
 *
 * - FZ ctx builder preserves harmonicVoice from inherited metadata
 * - Primary frank_zappa + HV: FZ precompute still fires; HV survives precompute
 * - Non-FZ primary + HV=frank_zappa: gate does NOT open (Batch 1 discipline)
 * - Non-HV FZ path: still emits fz receipts
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import type { BigBandFormPlan } from '../core/big-band/bigBandPlanTypes';
import {
  buildFrankZappaBigBandCompositionContext,
  runBigBandRealisation,
} from '../core/big-band/runBigBandRealisation';
import { precomputeFrankZappaEffectiveHarmonyBars } from '../core/song-mode/frankZappaSlice';

function formPlan8(): BigBandFormPlan {
  return {
    totalBars: 8,
    slices: [{ index: 0, phase: 'head', startBar: 1, endBar: 8 }],
  } as BigBandFormPlan;
}

function testBuilderPreservesHv(): boolean {
  const ctx = buildFrankZappaBigBandCompositionContext({
    seed: 42,
    chordBars: [...Array(8).fill('Cmaj7')] as string[],
    formPlan: formPlan8(),
    inheritedMetadata: {
      generatedAt: new Date().toISOString(),
      songwriterStyleId: 'frank_zappa',
      harmonicVoice: 'donald_fagen',
    },
  });
  return ctx.generationMetadata?.harmonicVoice === 'donald_fagen';
}

function testBuilderOmitsHvWhenAbsent(): boolean {
  const ctx = buildFrankZappaBigBandCompositionContext({
    seed: 42,
    chordBars: [...Array(8).fill('Cmaj7')] as string[],
    formPlan: formPlan8(),
  });
  return ctx.generationMetadata?.harmonicVoice === undefined;
}

function testHvSurvivesPrecompute(): boolean {
  const ctx = buildFrankZappaBigBandCompositionContext({
    seed: 1673965981,
    chordBars: [...Array(16).fill('Cmaj7')] as string[],
    formPlan: {
      totalBars: 16,
      slices: [{ index: 0, phase: 'head', startBar: 1, endBar: 16 }],
    } as BigBandFormPlan,
    inheritedMetadata: {
      generatedAt: new Date().toISOString(),
      songwriterStyleId: 'frank_zappa',
      harmonicVoice: 'donald_fagen',
    },
  });
  precomputeFrankZappaEffectiveHarmonyBars(ctx);
  const meta = ctx.generationMetadata as GenerationMetadata & {
    frankZappaDeviceReceipts?: string[];
  };
  return (
    meta.harmonicVoice === 'donald_fagen' &&
    Array.isArray(meta.frankZappaDeviceReceipts) &&
    (meta.frankZappaDeviceReceipts?.length ?? 0) >= 0
  );
}

function realiseFz(opts: {
  primary: string;
  harmonicVoice?: string;
  seed?: number;
  bars?: number;
}): ReturnType<typeof runBigBandRealisation> {
  const bars = opts.bars ?? 32;
  const chords = [...Array(Math.min(20, bars)).fill('Cmaj7'), ...Array(Math.max(0, bars - 20)).fill('Dm7')] as string[];
  while (chords.length < bars) chords.push('Cmaj7');
  return runBigBandRealisation({
    seed: opts.seed ?? 1673965981,
    title: 'BB FZ HV smoke',
    totalBars: bars,
    ensembleConfigId: 'full_band',
    stylePairing: {
      songwriterStyle: opts.primary,
      arrangerStyle: 'thad',
      era: 'post_bop',
    },
    era: 'post_bop',
    songwriterStyleId: opts.primary,
    chordProgressionText: chords.join(' | '),
    context: {
      systemVersion: '2.0.0',
      presetId: 'big_band',
      seed: opts.seed ?? 1673965981,
      form: { totalBars: bars, sections: [{ label: 'A', startBar: 1, length: bars }] },
      generationMetadata: {
        generatedAt: new Date().toISOString(),
        songwriterStyleId: opts.primary,
        ...(opts.harmonicVoice ? { harmonicVoice: opts.harmonicVoice } : {}),
      },
    } as CompositionContext,
  });
}

function testPrimaryFzPlusHvStillRunsFz(): boolean {
  const r = realiseFz({ primary: 'frank_zappa', harmonicVoice: 'donald_fagen' });
  const receipts = r.frankZappaDeviceReceipts ?? [];
  return receipts.length > 0 && receipts.some((x) => x.toLowerCase().includes('fz:'));
}

function testHvDoesNotOpenFzGate(): boolean {
  const r = realiseFz({ primary: 'barry_harris', harmonicVoice: 'frank_zappa', bars: 8 });
  return (r.frankZappaDeviceReceipts?.length ?? 0) === 0;
}

function testNonHvFzUnaffected(): boolean {
  const a = realiseFz({ primary: 'frank_zappa' });
  const b = realiseFz({ primary: 'frank_zappa', harmonicVoice: undefined });
  const ra = (a.frankZappaDeviceReceipts ?? []).join('|');
  const rb = (b.frankZappaDeviceReceipts ?? []).join('|');
  return ra.length > 0 && ra === rb;
}

export function runBigBandFzHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'BB FZ HV: builder preserves harmonicVoice from inherited metadata',
      ok: testBuilderPreservesHv(),
    },
    {
      name: 'BB FZ HV: builder omits HV when absent (non-HV path)',
      ok: testBuilderOmitsHvWhenAbsent(),
    },
    {
      name: 'BB FZ HV: HV survives precomputeFrankZappaEffectiveHarmonyBars',
      ok: testHvSurvivesPrecompute(),
    },
    {
      name: 'BB FZ HV: frank_zappa primary + other HV still runs FZ precompute',
      ok: testPrimaryFzPlusHvStillRunsFz(),
    },
    {
      name: 'BB FZ HV: HV=frank_zappa does not open FZ gate when primary is not FZ',
      ok: testHvDoesNotOpenFzGate(),
    },
    {
      name: 'BB FZ HV: non-HV FZ receipts stable (== explicit undefined HV)',
      ok: testNonHvFzUnaffected(),
    },
  ];
}