/**
 * V82b+c - Barry Harris section spans.
 */

import type { CompositionContext } from '../compositionContext';
import type { BarryHarrisSectionSpan } from './types';

type DeepImportSectionStart = { bar: number; label: string };

function sectionStartsToSpans(starts: readonly DeepImportSectionStart[], totalBars: number): BarryHarrisSectionSpan[] {
  const rows = starts.length ? [...starts] : [{ bar: 1, label: 'A' }];
  if (rows[0]!.bar !== 1) rows.unshift({ bar: 1, label: 'A' });
  return rows.map((s, idx) => {
    const next = rows[idx + 1]?.bar ?? totalBars + 1;
    const startBar = Math.max(1, Math.min(totalBars, s.bar));
    const endBar = Math.max(startBar, Math.min(totalBars, next - 1));
    return { sectionLabel: s.label, startBar, endBar };
  });
}

function readDeepImportSectionStarts(context: CompositionContext): DeepImportSectionStart[] {
  const meta = context.generationMetadata as Record<string, unknown> | undefined;
  const fromMeta = meta?.musicXmlDeepImportSectionStarts;
  if (Array.isArray(fromMeta) && fromMeta.length > 0) return fromMeta as DeepImportSectionStart[];
  return [];
}

export function resolveBarryHarrisSectionSpans(context: CompositionContext): BarryHarrisSectionSpan[] {
  const totalBars = context.form.totalBars;
  const mosaic = context.generationMetadata?.mosaicSectionPlan;
  if (mosaic?.length) {
    return mosaic.map((s) => ({ sectionLabel: s.sectionLabel, startBar: s.startBar, endBar: s.endBar }));
  }
  const songSections = context.song?.sections;
  if (songSections?.length) {
    return songSections.map((s) => ({
      sectionLabel: s.label || s.id,
      startBar: s.barRange.startBar,
      endBar: s.barRange.endBar,
    }));
  }
  const deepStarts = readDeepImportSectionStarts(context);
  if (deepStarts.length) return sectionStartsToSpans(deepStarts, totalBars);
  return [{ sectionLabel: 'A', startBar: 1, endBar: totalBars }];
}