/**
 * Map internal Composer OS `CompositionContext` → ReferencePiece (no file I/O).
 */

import type { CompositionContext } from '../compositionContext';
import type { ReferencePiece } from './referencePieceTypes';

export function referencePieceFromCompositionContext(ctx: CompositionContext): ReferencePiece {
  const sections = ctx.form.sections.map((s) => ({
    label: s.label,
    startBar: s.startBar,
    barCount: s.length,
  }));

  const chordSegments = ctx.chordSymbolPlan.segments.map((s) => ({
    chord: s.chord,
    startBar: s.startBar,
    bars: s.bars,
  }));

  const rehearsalMarks = ctx.rehearsalMarkPlan.marks.map((m) => ({
    label: m.label,
    bar: m.bar,
  }));

  let harmonicRhythmBars = 0;
  if (chordSegments.length > 0) {
    harmonicRhythmBars = chordSegments.reduce((a, s) => a + s.bars, 0) / chordSegments.length;
  }

  return {
    sourceKind: 'composer_os_internal',
    title: ctx.presetId,
    totalBars: ctx.form.totalBars,
    sections,
    chordSegments,
    rehearsalMarks,
    pitchByPart: {},
    noteSamples: [],
    harmonicRhythmBars,
    warnings: [],
    partial: false,
  };
}
