/**
 * Chorus return identity — reuse first chorus harmony + opening guitar motif on later choruses.
 * Uses the same measure-clone pattern as mosaic section retry (no new generator).
 * When destination harmony differs from source, motif pitches are degree-adapted at write time.
 */

import type { MosaicModeSectionPlanEntry } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import type { MeasureModel, NoteEvent, ScoreModel } from '../score-model/scoreModelTypes';
import type { SectionChordPlan } from './songCompilationTypes';
import { lockedHarmonyChordSymbolsEquivalent } from '../harmony/chordProgressionParser';
import { adaptMotifChainToDestinationChord } from '../goldenPath/phraseEngineV2';

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
 * Literal copy when source/dest chords match; otherwise destination-chord degree adaptation.
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
      const destChord = (prev.chord ?? '').trim();
      if (prev.chord != null) cloned.chord = prev.chord;

      const sourceChord = (src.chord ?? '').trim();
      if (
        sourceChord &&
        destChord &&
        !lockedHarmonyChordSymbolsEquivalent(sourceChord, destChord)
      ) {
        const noteIdxs: number[] = [];
        const chain: number[] = [];
        for (let ei = 0; ei < cloned.events.length; ei++) {
          const ev = cloned.events[ei]!;
          if (ev.kind !== 'note') continue;
          if (((ev as NoteEvent).voice ?? 1) !== 1) continue;
          noteIdxs.push(ei);
          chain.push((ev as NoteEvent).pitch);
        }
        if (chain.length > 0) {
          const adapted = adaptMotifChainToDestinationChord(chain, sourceChord, destChord, 'mid');
          for (let ni = 0; ni < noteIdxs.length; ni++) {
            const ei = noteIdxs[ni]!;
            const ev = cloned.events[ei] as NoteEvent;
            cloned.events[ei] = { ...ev, pitch: adapted[ni]! };
          }
        }
      }

      part.measures[dstIdx] = cloned;
    }
  }
  return out;
}
