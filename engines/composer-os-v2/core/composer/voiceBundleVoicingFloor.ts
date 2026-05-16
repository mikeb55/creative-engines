/**
 * Phase 2+3a/3b — guitar chord/note vertical spread with voice-leading solver selection.
 */

import type { CompositionContext } from '../compositionContext';
import type { ChordEvent, NoteEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { tensionLevelForBar } from './harmonicScene';
import { solveVoiceLeading, type VoicingCandidate } from './voiceLeadingSolver';
import { effectiveSpreadSemitonesFromMetadata } from './bigBandSectionPlanRenderer';

const CEILING = 88;

function widenStack(sorted: number[], minS: number, maxS: number): number[] {
  const lo = sorted[0]!;
  const hi = sorted[sorted.length - 1]!;
  const spread = hi - lo;
  if (spread >= minS) return sorted;
  const cappedTarget = Math.min(lo + maxS, CEILING);
  let newHi = Math.min(lo + minS, cappedTarget);
  if (newHi <= hi) newHi = Math.min(hi + (minS - spread), cappedTarget);
  if (newHi <= hi) return sorted;
  const repl = sorted.slice();
  repl[repl.length - 1] = newHi;
  return repl;
}

export function applyVoiceBundleVoicingSpreadFloor(score: ScoreModel, context: CompositionContext): void {
  const vb = context.voiceBundle;
  if (!vb) return;

  const scenes = context.harmonicScenes ?? [];

  for (let pi = 0; pi < score.parts.length; pi++) {
    const part = score.parts[pi]!;
    if (part.id !== 'guitar') continue;

    let prevVoicing: VoicingCandidate | null = null;
    const measures = part.measures.slice();

    for (let mi = 0; mi < measures.length; mi++) {
      const m = measures[mi]!;
      const barNum = m.index;
      const mdSt =
        context.generationMetadata as { stochasticVariance?: number; stochasticRenderOrdinal?: number } | undefined;
      const sched = context.generationMetadata.scheduledTensionByBar;
      const t = scenes.length ? tensionLevelForBar(barNum, vb, scenes, sched) : 0.5;
      const phase6Spread = effectiveSpreadSemitonesFromMetadata(context);
      const minS = Math.min(
        phase6Spread?.maxSpreadSemitones ?? vb.voicingPolicy.maxSpreadSemitones,
        Math.round(
          (phase6Spread?.minSpreadSemitones ?? vb.voicingPolicy.minSpreadSemitones) * (1 + t * 0.12),
        ),
      );
      const maxS = phase6Spread?.maxSpreadSemitones ?? vb.voicingPolicy.maxSpreadSemitones;

      let events = [...m.events];

      for (let ei = 0; ei < events.length; ei++) {
        const e = events[ei]!;
        if (e.kind !== 'chord') continue;
        const ch = e as ChordEvent;
        const pitches = ch.pitches;
        if (!pitches || pitches.length < 2) continue;

        const sorted = [...pitches].sort((a, b) => a - b);
        const widened = widenStack(sorted, minS, maxS);
        const res = solveVoiceLeading(
          [
            { notes: sorted, cost: 0 },
            { notes: widened, cost: 0 },
          ],
          prevVoicing,
          vb,
          {
            stochasticVariance: mdSt?.stochasticVariance,
            seed: context.seed,
            barIndex: barNum,
            renderOrdinal: mdSt?.stochasticRenderOrdinal ?? 0,
          }
        );
        events[ei] = { ...ch, pitches: res.chosen.notes };
        prevVoicing = { notes: res.chosen.notes, cost: 0 };
      }

      const byStart = new Map<number, number[]>();
      for (let ei = 0; ei < events.length; ei++) {
        const e = events[ei]!;
        if (e.kind !== 'note') continue;
        const n = e as NoteEvent;
        const t0 = n.startBeat;
        if (!byStart.has(t0)) byStart.set(t0, []);
        byStart.get(t0)!.push(ei);
      }
      for (const indices of byStart.values()) {
        if (indices.length < 2) continue;
        const pitches = indices.map((i) => (events[i] as NoteEvent).pitch);
        const sorted = [...pitches].sort((a, b) => a - b);
        const widened = widenStack(sorted, minS, maxS);
        const res = solveVoiceLeading(
          [
            { notes: sorted, cost: 0 },
            { notes: widened, cost: 0 },
          ],
          prevVoicing,
          vb,
          {
            stochasticVariance: mdSt?.stochasticVariance,
            seed: context.seed,
            barIndex: barNum,
            renderOrdinal: mdSt?.stochasticRenderOrdinal ?? 0,
          }
        );
        const out = res.chosen.notes;
        const order = indices
          .map((i) => ({ i, p: (events[i] as NoteEvent).pitch }))
          .sort((a, b) => a.p - b.p);
        for (let k = 0; k < order.length; k++) {
          const i = order[k]!.i;
          const src = events[i] as NoteEvent;
          events[i] = { ...src, pitch: out[k] ?? src.pitch };
        }
        prevVoicing = { notes: out, cost: 0 };
      }

      measures[mi] = { ...m, events };
    }
    score.parts[pi] = { ...part, measures };
  }
}
