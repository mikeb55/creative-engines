/**
 * Phase 2 Batch 2 — SQ Slonimsky HV routing (pure routing; FZ/mosaic/BB untouched).
 *
 * - Primary-only (no HV): bit-stable vs itself
 * - HV with mapped Slonimsky profile (donald_fagen): score differs vs primary-only
 * - Primary frank_zappa + unrelated HV: FZ SQ precompute still fires (gate stays primary)
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import type { NoteEvent } from '../core/score-model/scoreModelTypes';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';

function sqMeta(harmonicVoice?: string): GenerationMetadata {
  return {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: 'barry_harris',
    ...(harmonicVoice ? { harmonicVoice } : {}),
  };
}

function sqCtx(harmonicVoice?: string): CompositionContext {
  return {
    systemVersion: '2.0.0',
    presetId: 'string_quartet',
    seed: 94021,
    form: { totalBars: 8, sections: [{ label: 'A', startBar: 1, length: 8 }] },
    generationMetadata: sqMeta(harmonicVoice),
  } as CompositionContext;
}

function violin1Midis(score: NonNullable<ReturnType<typeof runQuartetRealisation>['score']>): number[] {
  const part = score.parts.find((p) => /violin\s*i\b/i.test(String(p.name ?? ''))) ?? score.parts[0];
  if (!part) return [];
  const midis: number[] = [];
  for (const m of part.measures ?? []) {
    for (const ev of m.events ?? []) {
      if (ev.kind === 'note') {
        const n = ev as NoteEvent;
        if (typeof n.pitch === 'number') midis.push(n.pitch);
      }
    }
  }
  return midis;
}

function realise(opts: {
  primary: string;
  harmonicVoice?: string;
  seed?: number;
}): ReturnType<typeof runQuartetRealisation> {
  const bars = 8;
  const chords = [...Array(bars).fill('Cmaj7')] as string[];
  return runQuartetRealisation({
    seed: opts.seed ?? 94021,
    title: 'SQ Slonimsky HV smoke',
    totalBars: bars,
    songwriterStyleId: opts.primary,
    chordProgressionText: chords.join(' | '),
    generationMetadata: sqMeta(opts.harmonicVoice),
    context: sqCtx(opts.harmonicVoice),
  });
}

function testPrimaryOnlyStable(): boolean {
  const a = realise({ primary: 'barry_harris' });
  const b = realise({ primary: 'barry_harris' });
  if (!a.score || !b.score || !a.exportPipeline.ok || !b.exportPipeline.ok) return false;
  const ma = violin1Midis(a.score).join(',');
  const mb = violin1Midis(b.score).join(',');
  return ma === mb && ma.length > 0;
}

function testHvChangesSlonimskyPath(): boolean {
  const baseline = realise({ primary: 'barry_harris' });
  const withHv = realise({ primary: 'barry_harris', harmonicVoice: 'donald_fagen' });
  if (!baseline.score || !withHv.score) return false;
  if (!baseline.exportPipeline.ok || !withHv.exportPipeline.ok) return false;
  const ma = violin1Midis(baseline.score).join(',');
  const mb = violin1Midis(withHv.score).join(',');
  return ma !== mb && ma.length > 0 && mb.length > 0;
}

function testNoHvMatchesPrimaryOnly(): boolean {
  const primary = realise({ primary: 'barry_harris' });
  const noHv = realise({ primary: 'barry_harris', harmonicVoice: undefined });
  if (!primary.score || !noHv.score) return false;
  return violin1Midis(primary.score).join(',') === violin1Midis(noHv.score).join(',');
}

function testFzGateStaysPrimary(): boolean {
  const chords = [...Array(16).fill('Cmaj7')] as string[];
  const progression = chords.join(' | ');
  const r = runQuartetRealisation({
    seed: 90917,
    title: 'FZ SQ gate + HV smoke',
    totalBars: 16,
    songwriterStyleId: 'frank_zappa',
    chordProgressionText: progression,
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      songwriterStyleId: 'frank_zappa',
      harmonicVoice: 'donald_fagen',
      zappaSQHarmonySlice: true,
      frankZappaEffectiveHarmonyBars: [...chords],
      parsedCustomProgressionBars: [...chords],
      harmonySource: 'custom',
    },
  });
  const meta = r.ensembleHarmonyMetadata as { zappaSQDeviceReceipts?: string[] } | undefined;
  const receipts = meta?.zappaSQDeviceReceipts ?? [];
  return receipts.length > 0 && receipts.some((x) => x.includes('fz:sq:'));
}

export function runSqSlonimskyHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'SQ Slonimsky HV: primary-only score stable (no HV)',
      ok: testPrimaryOnlyStable(),
    },
    {
      name: 'SQ Slonimsky HV: no HV === primary-only',
      ok: testNoHvMatchesPrimaryOnly(),
    },
    {
      name: 'SQ Slonimsky HV: donald_fagen HV changes SQ Slonimsky path vs barry_harris primary',
      ok: testHvChangesSlonimskyPath(),
    },
    {
      name: 'SQ Slonimsky HV: frank_zappa primary + other HV still runs FZ SQ precompute',
      ok: testFzGateStaysPrimary(),
    },
  ];
}