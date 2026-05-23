import { buildBigBandSlonimskyContext, buildQuartetSlonimskyContext } from '../core/slonimsky/slonimskyPatternService';
import { pushEnsembleSlonimskyCellReceipt } from '../core/slonimsky/slonimskyEnsembleReceipt';

function testBbReceipt(): boolean {
  const sink: string[] = [];
  const ctx = buildBigBandSlonimskyContext({
    duoIntent: 'guitar_lead',
    phase: 2,
    seed: 42,
    songwriterId: 'duke_ellington',
    totalQuarterBeats: 4,
    chordSymbol: 'F7',
    keyPc: 5,
    effectiveLow: 55,
    effectiveHigh: 80,
    catalogueSection: 'tritone_progression',
  });
  pushEnsembleSlonimskyCellReceipt(sink, 'bb', 4, ctx, 42);
  return sink.length === 1 && sink[0]!.startsWith('z10:bb@bar4');
}

function testSqReceipt(): boolean {
  const sink: string[] = [];
  const ctx = buildQuartetSlonimskyContext({
    duoIntent: 'development',
    phase: 1,
    seed: 42,
    songwriterId: 'bartok',
    totalQuarterBeats: 4,
    chordSymbol: 'Dm',
    keyPc: 2,
    effectiveLow: 55,
    effectiveHigh: 88,
    catalogueSection: 'semitone_progression',
  });
  pushEnsembleSlonimskyCellReceipt(sink, 'sq', 1, ctx, 42);
  return sink.length === 1 && sink[0]!.startsWith('z11:sq@bar1');
}

export function runSlonimskyEnsembleReceiptTests(): { name: string; ok: boolean }[] {
  return [
    ['Slonimsky Z10 — BB ensemble receipt', testBbReceipt],
    ['Slonimsky Z11 — SQ ensemble receipt', testSqReceipt],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
