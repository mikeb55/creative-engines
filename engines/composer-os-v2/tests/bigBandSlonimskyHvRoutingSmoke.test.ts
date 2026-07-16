/**
 * Phase 2 Batch 1 — BB Slonimsky HV routing (pure routing; FZ/mosaic/SQ untouched).
 *
 * - Primary-only (no HV): bit-stable vs itself
 * - HV with mapped Slonimsky profile (donald_fagen): score differs vs primary-only
 * - Primary frank_zappa + unrelated HV: FZ precompute still fires (gate stays primary)
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import type { NoteEvent } from '../core/score-model/scoreModelTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';

function bbCtx(harmonicVoice?: string): CompositionContext {
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: 'barry_harris',
    ...(harmonicVoice ? { harmonicVoice } : {}),
  };
  return {
    systemVersion: '2.0.0',
    presetId: 'big_band',
    seed: 94011,
    form: { totalBars: 8, sections: [{ label: 'A', startBar: 1, length: 8 }] },
    generationMetadata,
  } as CompositionContext;
}

function altoMidis(score: NonNullable<ReturnType<typeof runBigBandRealisation>['score']>): number[] {
  const part =
    score.parts.find((p) => /alto|sax/i.test(String(p.name ?? '')) || String(p.id ?? '').includes('sax')) ??
    score.parts[0];
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
}): ReturnType<typeof runBigBandRealisation> {
  const bars = 8;
  const chords = [...Array(bars).fill('Cmaj7')] as string[];
  return runBigBandRealisation({
    seed: opts.seed ?? 94011,
    title: 'BB Slonimsky HV smoke',
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
    context: bbCtx(opts.harmonicVoice),
  });
}

function testPrimaryOnlyStable(): boolean {
  const a = realise({ primary: 'barry_harris' });
  const b = realise({ primary: 'barry_harris' });
  if (!a.score || !b.score || !a.exportPipeline.ok || !b.exportPipeline.ok) return false;
  const ma = altoMidis(a.score).join(',');
  const mb = altoMidis(b.score).join(',');
  return ma === mb && ma.length > 0;
}

function testHvChangesSlonimskyPath(): boolean {
  const baseline = realise({ primary: 'barry_harris' });
  const withHv = realise({ primary: 'barry_harris', harmonicVoice: 'donald_fagen' });
  if (!baseline.score || !withHv.score) return false;
  if (!baseline.exportPipeline.ok || !withHv.exportPipeline.ok) return false;
  const ma = altoMidis(baseline.score).join(',');
  const mb = altoMidis(withHv.score).join(',');
  return ma !== mb && ma.length > 0 && mb.length > 0;
}

function testNoHvMatchesPrimaryOnly(): boolean {
  const primary = realise({ primary: 'barry_harris' });
  const noHv = realise({ primary: 'barry_harris', harmonicVoice: undefined });
  if (!primary.score || !noHv.score) return false;
  return altoMidis(primary.score).join(',') === altoMidis(noHv.score).join(',');
}

function testFzGateStaysPrimary(): boolean {
  const chords = [...Array(32).fill('Cmaj7')] as string[];
  const progression = chords.join(' | ');
  const r = runBigBandRealisation({
    seed: 1673965981,
    title: 'FZ gate + HV smoke',
    totalBars: 32,
    ensembleConfigId: 'full_band',
    stylePairing: {
      songwriterStyle: 'frank_zappa',
      arrangerStyle: 'thad',
      era: 'post_bop',
    },
    era: 'post_bop',
    songwriterStyleId: 'frank_zappa',
    chordProgressionText: progression,
    context: {
      systemVersion: '2.0.0',
      presetId: 'big_band',
      seed: 1673965981,
      form: { totalBars: 32, sections: [{ label: 'A', startBar: 1, length: 32 }] },
      generationMetadata: {
        generatedAt: new Date().toISOString(),
        songwriterStyleId: 'frank_zappa',
        harmonicVoice: 'donald_fagen',
      },
    } as CompositionContext,
  });
  const receipts = r.frankZappaDeviceReceipts ?? [];
  return receipts.length > 0 && receipts.some((x) => x.toLowerCase().includes('fz:'));
}

export function runBigBandSlonimskyHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'BB Slonimsky HV: primary-only score stable (no HV)',
      ok: testPrimaryOnlyStable(),
    },
    {
      name: 'BB Slonimsky HV: no HV === primary-only',
      ok: testNoHvMatchesPrimaryOnly(),
    },
    {
      name: 'BB Slonimsky HV: donald_fagen HV changes BB Slonimsky path vs barry_harris primary',
      ok: testHvChangesSlonimskyPath(),
    },
    {
      name: 'BB Slonimsky HV: frank_zappa primary + other HV still runs FZ precompute',
      ok: testFzGateStaysPrimary(),
    },
  ];
}