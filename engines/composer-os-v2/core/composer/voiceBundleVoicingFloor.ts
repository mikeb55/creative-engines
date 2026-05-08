/**
 * Phase 2+3a — widen guitar voicing stacks to satisfy VoiceRuleBundle min spread when active.
 */

import type { CompositionContext } from '../compositionContext';
import type { ChordEvent, NoteEvent, ScoreModel } from '../score-model/scoreModelTypes';

export function applyVoiceBundleVoicingSpreadFloor(score: ScoreModel, context: CompositionContext): void {
  const vb = context.voiceBundle;
  if (!vb) return;

  const minS = vb.voicingPolicy.minSpreadSemitones;
  const maxS = vb.voicingPolicy.maxSpreadSemitones;
  const ceiling = 88;

  for (let pi = 0; pi < score.parts.length; pi++) {
    const part = score.parts[pi]!;
    if (part.id !== 'guitar') continue;
    const measures = part.measures.slice();
    for (let mi = 0; mi < measures.length; mi++) {
      const m = measures[mi]!;
      let events = [...m.events];

      for (let ei = 0; ei < events.length; ei++) {
        const e = events[ei]!;
        if (e.kind !== 'chord') continue;
        const ch = e as ChordEvent;
        const pitches = ch.pitches;
        if (!pitches || pitches.length < 2) continue;

        const sorted = [...pitches].sort((a, b) => a - b);
        const lo = sorted[0]!;
        const hi = sorted[sorted.length - 1]!;
        const spread = hi - lo;
        if (spread >= minS) continue;

        const cappedTarget = Math.min(lo + maxS, ceiling);
        let newHi = Math.min(lo + minS, cappedTarget);
        if (newHi <= hi) newHi = Math.min(hi + (minS - spread), cappedTarget);
        if (newHi <= hi) continue;

        const repl = sorted.slice();
        repl[repl.length - 1] = newHi;
        events[ei] = { ...ch, pitches: repl };
      }

      const byStart = new Map<number, number[]>();
      for (let ei = 0; ei < events.length; ei++) {
        const e = events[ei]!;
        if (e.kind !== 'note') continue;
        const n = e as NoteEvent;
        const t = n.startBeat;
        if (!byStart.has(t)) byStart.set(t, []);
        byStart.get(t)!.push(ei);
      }
      for (const indices of byStart.values()) {
        if (indices.length < 2) continue;
        const pitches = indices.map((i) => (events[i] as NoteEvent).pitch);
        const lo = Math.min(...pitches);
        const hi = Math.max(...pitches);
        const spread = hi - lo;
        if (spread >= minS) continue;
        const cappedTarget = Math.min(lo + maxS, ceiling);
        let newHi = Math.min(lo + minS, cappedTarget);
        if (newHi <= hi) newHi = Math.min(hi + (minS - spread), cappedTarget);
        if (newHi <= hi) continue;
        const victimIdx = indices.find((i) => (events[i] as NoteEvent).pitch === hi);
        if (victimIdx === undefined) continue;
        const victim = events[victimIdx] as NoteEvent;
        events[victimIdx] = { ...victim, pitch: newHi };
      }

      measures[mi] = { ...m, events };
    }
    score.parts[pi] = { ...part, measures };
  }
}
