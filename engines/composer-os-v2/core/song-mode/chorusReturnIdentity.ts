/**
 * Chorus return identity — reuse first chorus harmony + opening guitar motif on later choruses.
 * Uses the same measure-clone pattern as mosaic section retry (no new generator).
 */

import type { MosaicModeSectionPlanEntry } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import type { MeasureModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { SectionChordPlan } from './songCompilationTypes';

function cloneMeasure(m: MeasureModel): MeasureModel {
  return {
    ...m,
    events: m.events.map((ev) => ({ ...ev })),
  };
}

/** Later `chorus` blocks reuse the first chorus's chord symbols (tiled/truncated to length). */
export function alignRepeatedChorusHarmony(chordPlan: SectionChordPlan[]): SectionChordPlan[] {
  const first = chordPlan.find((p) => p.sectionKind === 'chorus');
  if (!first?.chordSymbols.length) return chordPlan;
  let seen = false;
  return chordPlan.map((block) => {
    if (block.sectionKind !== 'chorus') return block;
    if (!seen) {
      seen = true;
      return block;
    }
    const src = first.chordSymbols;
    const n = block.chordSymbols.length;
    const chordSymbols = Array.from({ length: n }, (_, i) => src[i % src.length]!);
    return { ...block, chordSymbols };
  });
}

/**
 * Copy guitar opening bars from first `chorus_*` mosaic section onto later chorus sections.
 * Default: 1 bar (opening motif cell). Bridge and other sections untouched.
 */
export function applyChorusOpeningMotifRecall(
  score: ScoreModel,
  mosaicPlan: readonly MosaicModeSectionPlanEntry[],
  options?: { openingBars?: number; partId?: string }
): ScoreModel {
  const openingBars = Math.max(1, Math.floor(options?.openingBars ?? 1));
  const partId = options?.partId ?? 'guitar';
  const choruses = mosaicPlan.filter((s) => /^chorus(_\d+)?$/i.test(s.sectionLabel) || s.sectionLabel.startsWith('chorus_'));
  /** Labels from mapper are `chorus_0`, `chorus_1`, … */
  const byLabel = mosaicPlan.filter((s) => s.sectionLabel.startsWith('chorus_'));
  const list = byLabel.length >= 2 ? byLabel : choruses;
  if (list.length < 2) return score;

  const source = list[0]!;
  const out = structuredClone(score) as ScoreModel;
  const part = out.parts.find((p) => p.id === partId);
  if (!part) return score;

  for (let c = 1; c < list.length; c++) {
    const target = list[c]!;
    const span = Math.min(
      openingBars,
      source.endBar - source.startBar + 1,
      target.endBar - target.startBar + 1
    );
    for (let i = 0; i < span; i++) {
      const srcBar = source.startBar + i;
      const dstBar = target.startBar + i;
      const src = part.measures.find((m) => m.index === srcBar);
      const dstIdx = part.measures.findIndex((m) => m.index === dstBar);
      if (!src || dstIdx < 0) continue;
      const prev = part.measures[dstIdx]!;
      const cloned = cloneMeasure(src);
      cloned.index = dstBar;
      /** Keep destination bar's chord symbol (locked harmony already aligned). */
      if (prev.chord != null) cloned.chord = prev.chord;
      part.measures[dstIdx] = cloned;
    }
  }
  return out;
}
