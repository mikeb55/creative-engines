/**
 * Z9 — Song Mode Slonimsky cell selection on the songwriter layer.
 */

import type { CompositionContext } from '../compositionContext';
import { buildGuitarBassDuoSlonimskyContext } from '../slonimsky/slonimskyPatternService';
import { selectSlonimskyPattern } from '../slonimsky/slonimskyEngine';

const SLONIMSKY_SONGWRITER_IDS = new Set([
  'pat_metheny',
  'frank_zappa',
  'sonic_youth',
  'joni_mitchell',
  'radiohead',
]);

export function applySongModeSlonimskyCellLayer(context: CompositionContext): void {
  const meta = context.generationMetadata;
  const songwriterId = meta.songwriterStyleId;
  if (!songwriterId || !SLONIMSKY_SONGWRITER_IDS.has(songwriterId)) return;

  const chord = context.lockedHarmonyBarsRaw?.[0] ?? 'Cmaj7';
  const ctx = buildGuitarBassDuoSlonimskyContext({
    duoIntent: 'development',
    phase: 1,
    seed: context.seed,
    songwriterId,
    totalQuarterBeats: 4,
    chordSymbol: chord,
    keyPc: 0,
    effectiveLow: 52,
    effectiveHigh: 84,
  });
  const pattern = selectSlonimskyPattern(ctx, context.seed + 4242);
  const receipt = `z9:songwriter=${songwriterId} pattern=${pattern?.id ?? 'none'} intent=${ctx.phraseIntent}`;
  meta.slonimskySongModeCellReceipts = [receipt, ...(meta.slonimskySongModeCellReceipts ?? [])];
}
