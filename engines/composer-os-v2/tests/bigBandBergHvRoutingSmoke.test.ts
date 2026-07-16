/**
 * Phase 2 Batch 6 - BB Berg HV-only non-mosaic harmony bridge.
 *
 * - HV=berg: precompute fires, bg:* receipts, chordBars rewrite
 * - Primary berg without HV: wall does NOT fire (HV-only)
 * - Other HV (beefheart / threadgill): zero Berg receipts; Badalamenti still unwired → chord parity
 * - frank_zappa primary: Berg wall skipped
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import {
  buildBergEnsemblePrecomputeContext,
  isBergHvOnlyEnsembleWall,
  precomputeBergEffectiveHarmonyBars,
} from '../core/song-mode/bergSlice';

function bbCtx(opts: { primary: string; harmonicVoice?: string }): CompositionContext {
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: opts.primary,
    ...(opts.harmonicVoice ? { harmonicVoice: opts.harmonicVoice } : {}),
  };
  return {
    systemVersion: '2.0.0',
    presetId: 'big_band',
    seed: 96061,
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
    seed: opts.seed ?? 96061,
    title: 'BB Berg HV smoke',
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
    isBergHvOnlyEnsembleWall({ harmonicVoice: 'berg', songwriterStyleId: 'wayne_shorter' }) === true &&
    isBergHvOnlyEnsembleWall({ harmonicVoice: undefined, songwriterStyleId: 'berg' }) === false &&
    isBergHvOnlyEnsembleWall({ harmonicVoice: 'alban_berg', songwriterStyleId: 'wayne_shorter' }) ===
      false &&
    isBergHvOnlyEnsembleWall({ harmonicVoice: 'berg', songwriterStyleId: 'frank_zappa' }) === false &&
    isBergHvOnlyEnsembleWall({ harmonicVoice: 'beefheart', songwriterStyleId: 'wayne_shorter' }) ===
      false
  );
}

function testBuilderPrecomputeRewrites(): boolean {
  const bars = [...Array(16).fill('Cmaj7')] as string[];
  const ctx = buildBergEnsemblePrecomputeContext({
    seed: 96061,
    chordBars: bars,
    sections: [{ label: 'A', startBar: 1, length: 16 }],
    presetId: 'big_band',
    songwriterStyleId: 'wayne_shorter',
  });
  precomputeBergEffectiveHarmonyBars(ctx);
  const meta = ctx.generationMetadata as GenerationMetadata & {
    bergEffectiveHarmonyBars?: string[];
    bergDeviceReceipts?: string[];
  };
  const out = meta.bergEffectiveHarmonyBars ?? [];
  const receipts = meta.bergDeviceReceipts ?? [];
  return (
    out.length === 16 &&
    out.join('|') !== bars.join('|') &&
    receipts.some((r) => r.startsWith('bg:'))
  );
}

function testHvBergFires(): boolean {
  const r = realise({ primary: 'wayne_shorter', harmonicVoice: 'berg' });
  const receipts = r.bergDeviceReceipts ?? [];
  return receipts.some((x) => x.startsWith('bg:')) && scoreChords(r.score).length > 0;
}

function testPrimaryBergNoHvUnchanged(): boolean {
  const a = realise({ primary: 'berg' });
  const b = realise({ primary: 'wayne_shorter' });
  if ((a.bergDeviceReceipts?.length ?? 0) !== 0) return false;
  return scoreChords(a.score) === scoreChords(b.score);
}

function testSpotCheckOtherHvZeroBerg(): boolean {
  const baseline = realise({ primary: 'wayne_shorter' });
  const beef = realise({ primary: 'wayne_shorter', harmonicVoice: 'beefheart' });
  const badalamenti = realise({ primary: 'wayne_shorter', harmonicVoice: 'angelo_badalamenti' });
  if ((beef.bergDeviceReceipts?.length ?? 0) !== 0) return false;
  if ((badalamenti.bergDeviceReceipts?.length ?? 0) !== 0) return false;
  const bc = scoreChords(baseline.score);
  // Beefheart HV rewrites chords (Phase 2 widen); Badalamenti still unwired → chord parity with baseline.
  return scoreChords(beef.score).length > 0 && bc === scoreChords(badalamenti.score) && bc.length > 0;
}

function testFzPrimarySkipsBergWall(): boolean {
  const r = realise({ primary: 'frank_zappa', harmonicVoice: 'berg', bars: 16 });
  return (r.bergDeviceReceipts?.length ?? 0) === 0;
}

export function runBigBandBergHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'BB Berg HV: isBergHvOnlyEnsembleWall gate (HV-only, FZ excluded, soft alias no)',
      ok: testGateHvOnly(),
    },
    {
      name: 'BB Berg HV: buildBergEnsemblePrecomputeContext + precompute rewrites bars',
      ok: testBuilderPrecomputeRewrites(),
    },
    {
      name: 'BB Berg HV: HV=berg fires wall + bg:* receipts',
      ok: testHvBergFires(),
    },
    {
      name: 'BB Berg HV: primary berg without HV does not fire wall',
      ok: testPrimaryBergNoHvUnchanged(),
    },
    {
      name: 'BB Berg HV: beefheart/badalamenti HV spot-check - zero Berg receipts',
      ok: testSpotCheckOtherHvZeroBerg(),
    },
    {
      name: 'BB Berg HV: frank_zappa primary + HV=berg skips Berg wall',
      ok: testFzPrimarySkipsBergWall(),
    },
  ];
}
