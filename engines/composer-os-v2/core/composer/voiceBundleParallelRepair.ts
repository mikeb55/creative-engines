/**
 * Phase 3b — parallel fifth reduction on guitar chord stacks (oracle = solver cost).
 */

import type { CompositionContext } from '../compositionContext';
import type { ChordEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { scoreVoicingCandidate } from './voiceLeadingSolver';

function sorted(n: number[]): number[] {
  return [...n].sort((a, b) => a - b);
}

function outerParallelFifth(prev: number[], curr: number[]): boolean {
  if (prev.length < 2 || curr.length < 2) return false;
  const ps = sorted(prev);
  const cs = sorted(curr);
  const pi = Math.abs(ps[ps.length - 1]! - ps[0]!) % 12;
  const ci = Math.abs(cs[cs.length - 1]! - cs[0]!) % 12;
  if (pi !== 7 || ci !== 7) return false;
  const d0 = cs[0]! - ps[0]!;
  const d1 = cs[cs.length - 1]! - ps[ps.length - 1]!;
  return Math.sign(d0) === Math.sign(d1) && d0 !== 0;
}

function overlapPairCount(notes: number[]): number {
  const s = [...notes].sort((a, b) => a - b);
  let pairs = 0;
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      if (Math.abs(s[i]! - s[j]!) < 3) pairs++;
    }
  }
  return pairs;
}

/** When overlap pairs exceed policy, spread close chord tones (+12) until within limit. */
export function applyVoiceBundleOverlapMitigation(score: ScoreModel, context: CompositionContext): void {
  const vb = context.voiceBundle;
  if (!vb) return;
  const md = context.generationMetadata;
  const maxOv =
    md.voiceBundleRepairMaxVoiceOverlap !== undefined
      ? md.voiceBundleRepairMaxVoiceOverlap
      : vb.repairPolicy.maxVoiceOverlap;

  const lines = [...(md.voiceBundleVoiceLeadingRepairs ?? [])];

  for (let pi = 0; pi < score.parts.length; pi++) {
    const part = score.parts[pi]!;
    if (part.id !== 'guitar') continue;

    const measures = part.measures.map((mm) => ({ ...mm, events: [...mm.events] }));

    for (let mi = 0; mi < measures.length; mi++) {
      const m = measures[mi]!;
      const bar = m.index;
      const evs = [...m.events];
      for (let ei = 0; ei < evs.length; ei++) {
        const e = evs[ei]!;
        if (e.kind !== 'chord') continue;
        const ch = e as ChordEvent;
        const pitches = ch.pitches;
        if (!pitches || pitches.length < 2) continue;
        if (overlapPairCount(pitches) <= maxOv) continue;

        let ns = [...pitches].sort((a, b) => a - b);
        let iterations = 0;
        while (overlapPairCount(ns) > maxOv && iterations < 16) {
          iterations++;
          let fixed = false;
          for (let i = 0; i < ns.length - 1; i++) {
            if (ns[i + 1]! - ns[i]! < 3) {
              ns[i + 1] = Math.min(88, ns[i + 1]! + 12);
              fixed = true;
              break;
            }
          }
          if (!fixed) break;
        }
        if (iterations > 0 && overlapPairCount(ns) < overlapPairCount(pitches)) {
          const msg = `[VoiceLeadingSolver] voice=${vb.voiceId} bar=${bar} overlap-mitigation part=${part.id}`;
          console.warn(msg);
          lines.push(msg);
          evs[ei] = { ...ch, pitches: ns };
        }
      }
      measures[mi] = { ...m, events: evs };
    }
    score.parts[pi] = { ...part, measures };
  }

  context.generationMetadata = {
    ...context.generationMetadata,
    voiceBundleVoiceLeadingRepairs: lines,
  };
}

export function applyVoiceBundleParallelRepairPass(score: ScoreModel, context: CompositionContext): void {
  const vb = context.voiceBundle;
  const md = context.generationMetadata;
  const resolveRequested =
    vb?.repairPolicy.resolveParallels === true || md.voiceBundleRepairResolveParallelsRequested === true;
  if (!vb || !resolveRequested) return;

  const lines = [...(md.voiceBundleVoiceLeadingRepairs ?? [])];

  for (let pi = 0; pi < score.parts.length; pi++) {
    const part = score.parts[pi]!;
    if (part.id !== 'guitar') continue;

    let prevPitches: number[] | null = null;
    const measures = part.measures.map((mm) => ({ ...mm, events: [...mm.events] }));

    for (let mi = 0; mi < measures.length; mi++) {
      const m = measures[mi]!;
      const bar = m.index;
      const evs = [...m.events];
      for (let ei = 0; ei < evs.length; ei++) {
        const e = evs[ei]!;
        if (e.kind !== 'chord') continue;
        const ch = e as ChordEvent;
        const pitches = ch.pitches;
        if (!pitches || pitches.length < 2) continue;

        if (prevPitches && outerParallelFifth(prevPitches, pitches)) {
          const adj = [...pitches];
          const hiIx = adj.indexOf(Math.max(...adj));
          adj[hiIx] = Math.min(88, adj[hiIx]! + 1);
          const before = scoreVoicingCandidate({ notes: pitches, cost: 0 }, { notes: prevPitches, cost: 0 }, vb);
          const after = scoreVoicingCandidate({ notes: adj, cost: 0 }, { notes: prevPitches, cost: 0 }, vb);
          if (after.totalCost <= before.totalCost) {
            evs[ei] = { ...ch, pitches: adj };
            const msg = `[VoiceLeadingSolver] voice=${vb.voiceId} bar=${bar} parallel-fifth-nudge part=${part.id}`;
            console.warn(msg);
            lines.push(msg);
          }
        }
        const cur = (evs[ei] as ChordEvent).pitches ?? pitches;
        prevPitches = [...cur];
      }
      measures[mi] = { ...m, events: evs };
    }
    score.parts[pi] = { ...part, measures };
  }

  context.generationMetadata = {
    ...context.generationMetadata,
    voiceBundleVoiceLeadingRepairs: lines,
  };
}
