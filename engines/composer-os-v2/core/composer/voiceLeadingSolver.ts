/**
 * Phase 3b — voice-leading candidate scorer (Dijkstra-ready discrete candidate enumeration).
 * Reference vocabulary only — optimal-voice-leading–style additive costs.
 */

import type { VoiceRuleBundle } from './voiceRuleBundle';
import { weightedChordSample } from './stochasticLayer';

export interface VoicingCandidate {
  notes: number[];
  cost: number;
}

export interface VoiceLeadingResult {
  chosen: VoicingCandidate;
  totalCost: number;
  repairsApplied: string[];
}

function sortedNotes(n: number[]): number[] {
  return [...n].sort((a, b) => a - b);
}

function intervalClass(a: number, b: number): number {
  return Math.abs(a - b) % 12;
}

/** Same-direction motion parallel fifth (simplest pairwise outer voices). */
function parallelFifthPenalty(prev: number[] | null, curr: number[]): number {
  if (!prev || prev.length < 2 || curr.length < 2) return 0;
  const ps = sortedNotes(prev);
  const cs = sortedNotes(curr);
  const pi = intervalClass(ps[0]!, ps[ps.length - 1]!);
  const ci = intervalClass(cs[0]!, cs[cs.length - 1]!);
  if (pi !== 7 || ci !== 7) return 0;
  const dlo = cs[0]! - ps[0]!;
  const dhi = cs[cs.length - 1]! - ps[ps.length - 1]!;
  if (Math.sign(dlo) === Math.sign(dhi) && dlo !== 0 && dhi !== 0) return 100;
  return 0;
}

function parallelOctavePenalty(prev: number[] | null, curr: number[]): number {
  if (!prev || prev.length < 2 || curr.length < 2) return 0;
  const ps = sortedNotes(prev);
  const cs = sortedNotes(curr);
  const oPrev = ps[ps.length - 1]! - ps[0]!;
  const oCurr = cs[cs.length - 1]! - cs[0]!;
  if (oPrev % 12 !== 0 || oCurr % 12 !== 0) return 0;
  if (oPrev < 10 || oCurr < 10) return 0;
  const dlo = cs[0]! - ps[0]!;
  const dhi = cs[cs.length - 1]! - ps[ps.length - 1]!;
  if (Math.sign(dlo) === Math.sign(dhi) && dlo !== 0 && dhi !== 0) return 100;
  return 0;
}

function voiceOverlapPenalty(curr: number[], maxOverlap: number): number {
  const s = sortedNotes(curr);
  let pairs = 0;
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      if (Math.abs(s[i]! - s[j]!) < 3) pairs++;
    }
  }
  return pairs > maxOverlap ? 50 * (pairs - maxOverlap) : 0;
}

function voiceMovementCost(prev: number[] | null, curr: number[]): number {
  if (!prev || prev.length !== curr.length) {
    if (!prev) return 0;
    return Math.abs(prev.length - curr.length) * 10;
  }
  const ps = [...prev].sort((a, b) => a - b);
  const cs = [...curr].sort((a, b) => a - b);
  let sum = 0;
  const n = Math.min(ps.length, cs.length);
  for (let i = 0; i < n; i++) sum += Math.abs(ps[i]! - cs[i]!);
  return sum;
}

function spreadPenalty(notes: number[], minS: number, maxS: number): number {
  if (notes.length < 2) return 75;
  const s = sortedNotes(notes);
  const sp = s[s.length - 1]! - s[0]!;
  if (sp < minS || sp > maxS) return 75;
  return 0;
}

function anchorTonePenalty(prev: number[] | null, curr: number[], anchorCount: number): number {
  if (anchorCount <= 0 || !prev) return 0;
  const kept = prev.filter((p) => curr.some((c) => Math.abs(c - p) <= 1));
  const lost = Math.max(0, anchorCount - kept.length);
  return lost * 60;
}

function simultaneousMotionPenalty(prev: number[] | null, curr: number[]): number {
  if (!prev || prev.length !== curr.length) return 0;
  let moving = 0;
  for (let i = 0; i < prev.length; i++) {
    if (curr[i] !== prev[i]) moving++;
  }
  return moving > 1 ? 70 : 0;
}

function gilEvansOctaveDoublePenalty(bundle: VoiceRuleBundle, notes: number[]): number {
  if (bundle.voiceId !== 'gil_evans') return 0;
  const s = sortedNotes(notes);
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      if (intervalClass(s[i]!, s[j]!) === 0 && Math.abs(s[i]! - s[j]!) >= 12) return 80;
    }
  }
  return 0;
}

function coltraneAugmentedReward(bundle: VoiceRuleBundle, prev: number[] | null, curr: number[]): number {
  if (bundle.voiceId !== 'john_coltrane' || !bundle.voicingPolicy.augmentedTriadLatticeBasis || !prev) return 0;
  const movement = voiceMovementCost(prev, curr);
  if (movement >= 3 && movement <= 16) return -20;
  return 0;
}

function wayneShorterCosts(bundle: VoiceRuleBundle, prev: number[] | null, curr: number[]): { add: number; sub: number } {
  if (bundle.voiceId !== 'wayne_shorter') return { add: 0, sub: 0 };
  let add = 0;
  let sub = 0;
  const bassPrev = prev ? sortedNotes(prev)[0] : undefined;
  const bassCurr = sortedNotes(curr)[0];
  if (bassPrev !== undefined && bassCurr !== undefined) {
    const leap = Math.abs(bassCurr - bassPrev);
    if (leap > 4) add += 40;
    else sub += 15;
    const axisOk = leap === 6 || leap === 3 || leap === 4 || leap === 5;
    if (axisOk) sub += 20;
    const delta = bassCurr - bassPrev;
    if (delta === -7 || delta === -5) add += 60;
  }
  return { add, sub };
}

function patMethenyRewards(bundle: VoiceRuleBundle, curr: number[]): number {
  if (bundle.voiceId !== 'pat_metheny') return 0;
  let r = 0;
  if (bundle.voicingPolicy.lydianMaj7Sharp11Default) r -= 25;
  return r;
}

function threadgillIntervalPenalty(bundle: VoiceRuleBundle, curr: number[]): number {
  if (bundle.voiceId !== 'henry_threadgill') return 0;
  const pool = bundle.melodicPolicy.preferredIntervalSets;
  if (!pool?.length) return 0;
  const s = sortedNotes(curr);
  let bad = 0;
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      const ic = intervalClass(s[i]!, s[j]!);
      if (!pool.includes(ic)) bad++;
    }
  }
  return bad * 90;
}

function mingusRewards(bundle: VoiceRuleBundle, prev: number[] | null, curr: number[]): number {
  if (bundle.voiceId !== 'charles_mingus') return 0;
  let r = 0;
  if (prev) {
    const pb = sortedNotes(prev)[0];
    const cb = sortedNotes(curr)[0];
    if (pb !== undefined && cb !== undefined && Math.abs(cb - pb) <= 2) r -= 20;
  }
  const s = sortedNotes(curr);
  if (s.length >= 2) {
    const sp = s[s.length - 1]! - s[0]!;
    if (sp < 7) r += 40;
  }
  return r;
}

/** Shorter: non-functional neighbour — no extra penalty when bass stepwise and upper voices unrelated. */
export function shorterNonFunctionalNeighbourBonus(
  bundle: VoiceRuleBundle,
  prev: number[] | null,
  curr: number[]
): number {
  if (bundle.voiceId !== 'wayne_shorter' || !prev || prev.length < 2 || curr.length < 2) return 0;
  const pb = sortedNotes(prev);
  const cb = sortedNotes(curr);
  const bassStep = Math.abs(cb[0]! - pb[0]!) <= 2;
  if (!bassStep) return 0;
  const upperPrev = new Set(pb.slice(1));
  const overlap = cb.slice(1).filter((x) => upperPrev.has(x)).length;
  if (overlap === 0) return -45;
  return 0;
}

export function scoreVoicingCandidate(
  candidate: VoicingCandidate,
  previous: VoicingCandidate | null,
  bundle: VoiceRuleBundle
): { totalCost: number; detail: string[] } {
  const prev = previous?.notes ?? null;
  const curr = candidate.notes;
  const detail: string[] = [];

  let cost = candidate.cost + voiceMovementCost(prev, curr);
  cost += parallelFifthPenalty(prev, curr);
  cost += parallelOctavePenalty(prev, curr);
  cost += voiceOverlapPenalty(curr, bundle.repairPolicy.maxVoiceOverlap);
  cost += spreadPenalty(curr, bundle.voicingPolicy.minSpreadSemitones, bundle.voicingPolicy.maxSpreadSemitones);
  cost += anchorTonePenalty(prev, curr, bundle.orchestrationPolicy.anchorToneCount);
  if (bundle.orchestrationPolicy.mutateSingleVoiceAtTime) {
    cost += simultaneousMotionPenalty(prev, curr);
  }
  cost += gilEvansOctaveDoublePenalty(bundle, curr);
  cost += coltraneAugmentedReward(bundle, prev, curr);
  const ws = wayneShorterCosts(bundle, prev, curr);
  cost += ws.add;
  cost -= ws.sub;
  cost += patMethenyRewards(bundle, curr);
  cost += threadgillIntervalPenalty(bundle, curr);
  cost += mingusRewards(bundle, prev, curr);
  cost += shorterNonFunctionalNeighbourBonus(bundle, prev, curr);

  if (parallelFifthPenalty(prev, curr) > 0) detail.push('parallel-fifth');
  if (parallelOctavePenalty(prev, curr) > 0) detail.push('parallel-octave');
  if (spreadPenalty(curr, bundle.voicingPolicy.minSpreadSemitones, bundle.voicingPolicy.maxSpreadSemitones) > 0)
    detail.push('spread');

  return { totalCost: Math.max(0, cost), detail };
}

export interface SolveVoiceLeadingStochasticOpts {
  stochasticVariance?: number;
  seed?: number;
  barIndex?: number;
  renderOrdinal?: number;
}

/**
 * Pick lowest-cost voicing from enumerated candidates, or weighted top-N sample when variance > 0.
 */
export function solveVoiceLeading(
  candidates: VoicingCandidate[],
  previous: VoicingCandidate | null,
  bundle: VoiceRuleBundle,
  stochastic?: SolveVoiceLeadingStochasticOpts
): VoiceLeadingResult {
  if (candidates.length === 0) {
    return {
      chosen: { notes: [], cost: 0 },
      totalCost: 0,
      repairsApplied: ['no-candidates'],
    };
  }

  const variance = stochastic?.stochasticVariance ?? 0;
  const rows = candidates.map((c) => {
    const scored = scoreVoicingCandidate(c, previous, bundle);
    return { cand: c, cost: scored.totalCost, detail: scored.detail };
  });

  if (variance <= 0 || stochastic?.seed === undefined) {
    let best = rows[0]!;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i]!.cost < best.cost) best = rows[i]!;
    }
    return { chosen: best.cand, totalCost: best.cost, repairsApplied: best.detail };
  }

  const pick = weightedChordSample(rows, variance, stochastic.seed, stochastic.barIndex ?? 0, stochastic.renderOrdinal ?? 0);
  const chosen = pick ?? rows[0]!;
  return { chosen: chosen.cand, totalCost: chosen.cost, repairsApplied: chosen.detail };
}
