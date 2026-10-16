/**
 * Observable hook returns. This does not predict catchiness.
 */

import type { CanonicalEvaluationScore, CanonicalEvent } from './canonicalScore';
import type { HookPlan } from '../song-mode/hookPlanner';

export interface HookEvidence {
  hookId: string;
  firstBar: number;
  returns: Array<{ bar: number; identity: 'exact' | 'transposed' | 'varied'; similarity: number }>;
  registerPeakBar: number | null;
  contrastBeforeReturn: number;
  musicalQualityScore: null;
  musicallyApproved: false;
}

function quarters(value: { n: number; d: number }): number {
  return value.n / value.d;
}

function sounding(events: readonly CanonicalEvent[]): CanonicalEvent[] {
  return events.filter((event) => event.soundingMidi !== null && !event.rest);
}

export function analyseHookEvidence(
  score: CanonicalEvaluationScore,
  hook: { hookId: string; midis: readonly number[] },
  plan?: HookPlan | null,
): HookEvidence {
  const cell = hook.midis.filter((midi) => Number.isFinite(midi));
  const hits: Array<{ bar: number; identity: 'exact' | 'transposed' | 'varied'; similarity: number; peak: number }> = [];
  for (const part of score.parts) {
    const notes = sounding(score.soundingEvents.filter((event) => event.partId === part.id));
    for (let start = 0; start + cell.length <= notes.length; start += 1) {
      const window = notes.slice(start, start + cell.length);
      const deltas = window.map((note, index) => (index === 0 ? 0 : note.soundingMidi! - window[0]!.soundingMidi!));
      const target = cell.map((midi, index) => (index === 0 ? 0 : midi - cell[0]!));
      const sameShape = deltas.every((delta, index) => delta === target[index]);
      if (!sameShape) continue;
      const shift = window[0]!.soundingMidi! - cell[0]!;
      const identity = shift === 0 ? 'exact' : 'transposed';
      hits.push({
        bar: window[0]!.bar,
        identity,
        similarity: identity === 'exact' ? 1 : 0.99,
        peak: Math.max(...window.map((note) => note.soundingMidi!)),
      });
    }
  }
  hits.sort((a, b) => a.bar - b.bar || b.similarity - a.similarity);
  const unique: typeof hits = [];
  for (const hit of hits) {
    if (unique.some((item) => item.bar === hit.bar && item.identity === hit.identity)) continue;
    unique.push(hit);
  }
  const first = unique[0];
  const returns = unique.slice(1).map((hit) => ({ bar: hit.bar, identity: hit.identity, similarity: hit.similarity }));
  const peak = unique.reduce<{ bar: number; midi: number } | null>((best, hit) => {
    if (!best || hit.peak > best.midi) return { bar: hit.bar, midi: hit.peak };
    return best;
  }, null);
  let contrastBeforeReturn = 0;
  const back = returns[0];
  if (back && first) {
    const before = pitchClasses(score, back.bar - 1);
    const home = pitchClasses(score, first.bar);
    contrastBeforeReturn = distance(before, home);
  }
  if (plan && plan.minRepetitionsAcrossForm > unique.length) {
    contrastBeforeReturn = Math.min(1, contrastBeforeReturn);
  }
  return {
    hookId: hook.hookId,
    firstBar: first?.bar ?? 1,
    returns,
    registerPeakBar: peak?.bar ?? null,
    contrastBeforeReturn,
    musicalQualityScore: null,
    musicallyApproved: false,
  };
}

function pitchClasses(score: CanonicalEvaluationScore, bar: number): Set<number> {
  const set = new Set<number>();
  for (const event of score.soundingEvents) {
    if (event.bar === bar && event.soundingMidi !== null) set.add(((event.soundingMidi % 12) + 12) % 12);
  }
  return set;
}

function distance(left: Set<number>, right: Set<number>): number {
  if (left.size === 0 && right.size === 0) return 0;
  let shared = 0;
  for (const pc of left) if (right.has(pc)) shared += 1;
  const union = new Set([...left, ...right]).size || 1;
  return Math.max(0, Math.min(1, 1 - shared / union));
}

export function onsetQuarters(event: CanonicalEvent): number {
  return quarters(event.onset);
}
