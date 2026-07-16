/**
 * Phase 2 Batch 5 — SQ FZ HV continuity VERIFY-ONLY (no production change).
 *
 * Unlike BB Batch 4, SQ FZ already passes full generationMetadata into precompute
 * (no bare-meta rebuild). Gate stays primary + zappaSQHarmonySlice (HV does not open).
 * Export bar-math flakiness on FZ SQ is out of scope — assert metadata/receipts only.
 */

import type { GenerationMetadata } from '../core/compositionContext';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';

function realise(opts: {
  primary: string;
  harmonicVoice?: string;
  zappaSQHarmonySlice?: boolean;
  seed?: number;
  bars?: number;
}): ReturnType<typeof runQuartetRealisation> {
  const bars = opts.bars ?? 16;
  const chords = [...Array(bars).fill('Cmaj7')] as string[];
  const slice = opts.zappaSQHarmonySlice === true || opts.primary === 'frank_zappa';
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: opts.primary,
    ...(opts.harmonicVoice ? { harmonicVoice: opts.harmonicVoice } : {}),
    ...(slice
      ? {
          zappaSQHarmonySlice: true,
          frankZappaEffectiveHarmonyBars: [...chords],
          parsedCustomProgressionBars: [...chords],
          harmonySource: 'custom' as const,
        }
      : {}),
  };
  return runQuartetRealisation({
    seed: opts.seed ?? 90917,
    title: 'SQ FZ HV verify',
    totalBars: bars,
    songwriterStyleId: opts.primary,
    chordProgressionText: chords.join(' | '),
    generationMetadata,
  });
}

function fzSqReceipts(r: ReturnType<typeof runQuartetRealisation>): string[] {
  const meta = r.ensembleHarmonyMetadata as { zappaSQDeviceReceipts?: string[] } | undefined;
  return meta?.zappaSQDeviceReceipts ?? [];
}

function testHvSurvivesPrecompute(): boolean {
  const r = realise({ primary: 'frank_zappa', harmonicVoice: 'donald_fagen' });
  if (!r.score) return false;
  const receipts = fzSqReceipts(r);
  return (
    r.ensembleHarmonyMetadata?.harmonicVoice === 'donald_fagen' &&
    receipts.some((x) => x.includes('fz:sq:'))
  );
}

function testNoHvOmitsField(): boolean {
  const r = realise({ primary: 'frank_zappa' });
  if (!r.score) return false;
  return (
    r.ensembleHarmonyMetadata?.harmonicVoice === undefined &&
    fzSqReceipts(r).some((x) => x.includes('fz:sq:'))
  );
}

function testHvDoesNotOpenGate(): boolean {
  const r = realise({
    primary: 'barry_harris',
    harmonicVoice: 'frank_zappa',
    zappaSQHarmonySlice: true,
    bars: 8,
  });
  return fzSqReceipts(r).length === 0;
}

function testNonHvStable(): boolean {
  const a = realise({ primary: 'frank_zappa' });
  const b = realise({ primary: 'frank_zappa', harmonicVoice: undefined });
  const ra = fzSqReceipts(a).join('|');
  const rb = fzSqReceipts(b).join('|');
  return ra.length > 0 && ra === rb;
}

export function runSqFzHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'SQ FZ HV: HV survives precompute (already continuous vs BB bare-meta drop)',
      ok: testHvSurvivesPrecompute(),
    },
    {
      name: 'SQ FZ HV: no HV omits field; FZ still runs',
      ok: testNoHvOmitsField(),
    },
    {
      name: 'SQ FZ HV: HV=frank_zappa does not open FZ gate when primary is not FZ',
      ok: testHvDoesNotOpenGate(),
    },
    {
      name: 'SQ FZ HV: non-HV FZ receipts stable (== explicit undefined HV)',
      ok: testNonHvStable(),
    },
  ];
}