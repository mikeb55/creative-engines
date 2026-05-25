/**
 * Z9 — Song Mode Slonimsky cell selection on the songwriter layer.
 */

import type { CompositionContext } from '../compositionContext';
import { getSlonimskyCellSetsForBar } from '../section-architecture/effectiveContextForBar';
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

  const sectionStarts = context.song?.sections.map((s) => s.barRange.startBar) ?? [1];
  const receipts = sectionStarts.map((bar) => {
    const chord = context.lockedHarmonyBarsRaw?.[bar - 1] ?? context.lockedHarmonyBarsRaw?.[0] ?? 'Cmaj7';
    const cellSets = getSlonimskyCellSetsForBar(bar, context);
    const ctx = buildGuitarBassDuoSlonimskyContext({
      duoIntent: 'development',
      phase: ((bar - 1) % 8) + 1,
      seed: context.seed + bar * 101,
      songwriterId,
      ...(cellSets?.[0] ? { catalogueSection: String(cellSets[0]), forceCatalogueSection: true } : {}),
      totalQuarterBeats: 4,
      chordSymbol: chord,
      keyPc: 0,
      effectiveLow: 52,
      effectiveHigh: 84,
    });
    const pattern = selectSlonimskyPattern(ctx, context.seed + 4242 + bar);
    if (!context.song) {
      return `z9:songwriter=${songwriterId} pattern=${pattern?.id ?? 'none'} intent=${ctx.phraseIntent}`;
    }
    return `z9:bar=${bar} songwriter=${songwriterId} cellSet=${cellSets?.[0] ?? 'default'} pattern=${pattern?.id ?? 'none'} intent=${ctx.phraseIntent}`;
  });
  meta.slonimskySongModeCellReceipts = [...receipts, ...(meta.slonimskySongModeCellReceipts ?? [])];
}
