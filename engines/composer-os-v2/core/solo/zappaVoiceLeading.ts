/**
 * Frank Zappa Musicality Phase 3 — guide-tone line, solo nudges, phrase goal targeting.
 */

import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { SoloNote, ZappaGuideToneBarReceipt, ZappaGuideToneReceipt } from './soloTypes';

function liftIntoRange(midi: number, low: number, high: number): number {
  let p = midi;
  while (p < low) p += 12;
  while (p > high) p -= 12;
  return Math.max(low, Math.min(high, p));
}

function isStructuralZappaSoloNote(n: SoloNote): boolean {
  return (
    n.marker === 'descending_minor_sixth' ||
    n.marker === 'tetrachord_0137' ||
    (n.tupletRole !== undefined && n.tupletRole !== 'plain')
  );
}

/** Lower is better; favours semitone motion and penalises leaps larger than a major third. */
function guideToneStepCost(deltaSemitones: number): number {
  const a = Math.abs(deltaSemitones);
  if (a <= 1) return a * 0.35;
  if (a <= 2) return a;
  if (a <= 4) return a + 2;
  return a + 10;
}

/**
 * When three consecutive bar-to-bar guide motions are all non-stepwise (|Δ|>2), re-pick third/seventh on the
 * interior bars to break the streak (Phase 3 continuity tuning).
 */
function repairZappaGuideToneLongBreakStreaks(
  bars: ZappaGuideToneBarReceipt[],
  chords: string[],
  low: number,
  high: number
): void {
  const n = bars.length;
  if (n < 4) return;
  for (let i = 1; i <= n - 3; i++) {
    const d1 = Math.abs(bars[i]!.guideMidi - bars[i - 1]!.guideMidi);
    const d2 = Math.abs(bars[i + 1]!.guideMidi - bars[i]!.guideMidi);
    const d3 = Math.abs(bars[i + 2]!.guideMidi - bars[i + 1]!.guideMidi);
    if (d1 <= 2 || d2 <= 2 || d3 <= 2) continue;
    for (const off of [0, 1] as const) {
      const bi = i + off;
      const sym = chords[bi] ?? 'C7';
      const t = chordTonesForChordSymbol(sym);
      const third = liftIntoRange(t.third ?? t.root + 4, low, high);
      const seventh = liftIntoRange(t.seventh ?? t.root + 10, low, high);
      const prev = bars[bi - 1]!.guideMidi;
      let best = bars[bi]!.guideMidi;
      let bestCost = guideToneStepCost(best - prev);
      for (const c of [third, seventh]) {
        const cst = guideToneStepCost(c - prev);
        if (cst < bestCost - 1e-6) {
          bestCost = cst;
          best = c;
        }
      }
      bars[bi]!.guideMidi = best;
      bars[bi]!.role = Math.abs(best - third) <= Math.abs(best - seventh) ? 'third' : 'seventh';
    }
  }
}

/**
 * Build per-bar third/seventh guide choices, preferring stepwise motion (≤2 semitones) bar-to-bar.
 */
export function buildZappaSmoothedGuideToneReceipt(
  chords: string[],
  tb: number,
  low: number,
  high: number
): ZappaGuideToneReceipt {
  const bars: ZappaGuideToneBarReceipt[] = [];
  for (let b = 1; b <= tb; b++) {
    const sym = chords[b - 1] ?? 'C7';
    const t = chordTonesForChordSymbol(sym);
    const third = liftIntoRange(t.third ?? t.root + 4, low, high);
    const seventh = liftIntoRange(t.seventh ?? t.root + 10, low, high);
    const preferredRole = b % 2 === 1 ? ('third' as const) : ('seventh' as const);
    let guideMidi = preferredRole === 'third' ? third : seventh;
    let role: 'third' | 'seventh' = preferredRole;
    if (b > 1) {
      const prev = bars[b - 2]!.guideMidi;
      const cands = [
        { midi: third, r: 'third' as const },
        { midi: seventh, r: 'seventh' as const },
      ];
      let bestM = cands[0]!.midi;
      let bestR = cands[0]!.r;
      let bestCost =
        guideToneStepCost(cands[0]!.midi - prev) - (cands[0]!.r === preferredRole ? 0.02 : 0);
      for (const c of cands) {
        let cost = guideToneStepCost(c.midi - prev);
        if (c.r === preferredRole) cost -= 0.02;
        if (cost < bestCost - 1e-6) {
          bestCost = cost;
          bestM = c.midi;
          bestR = c.r;
        }
      }
      guideMidi = bestM;
      role = bestR;
    }
    const prevMidi = b > 1 ? bars[b - 2]!.guideMidi : guideMidi;
    const semitoneMotionFromPrev = b === 1 ? 0 : guideMidi - prevMidi;
    bars.push({
      barIndex: b,
      chordSymbol: sym,
      role,
      guideMidi,
      semitoneMotionFromPrev,
    });
  }

  repairZappaGuideToneLongBreakStreaks(bars, chords, low, high);
  for (let b = 1; b <= tb; b++) {
    const row = bars[b - 1]!;
    row.semitoneMotionFromPrev = b === 1 ? 0 : row.guideMidi - bars[b - 2]!.guideMidi;
  }
  let okPairs = 0;
  let totalPairs = 0;
  for (let i = 1; i < bars.length; i++) {
    totalPairs++;
    const a = bars[i - 1]!.guideMidi;
    const c = bars[i]!.guideMidi;
    if (Math.abs(c - a) <= 2) okPairs++;
  }
  const stepwiseContinuityRatio = totalPairs === 0 ? 1 : okPairs / totalPairs;
  const stepwiseChainMet = totalPairs === 0 ? true : okPairs === totalPairs;
  return {
    bars,
    stepwiseContinuityRatio,
    stepwiseChainMet,
  };
}

/** Light pitch pulls so foreground notes hug the smoothed guide-tone line. */
export function applyZappaGuideTonePitchNudges(
  allNotes: SoloNote[],
  tb: number,
  receipt: ZappaGuideToneReceipt,
  low: number,
  high: number
): void {
  const byBar = new Map<number, SoloNote[]>();
  for (const n of allNotes) {
    if (!byBar.has(n.barIndex)) byBar.set(n.barIndex, []);
    byBar.get(n.barIndex)!.push(n);
  }
  for (let b = 1; b <= tb; b++) {
    const g = receipt.bars[b - 1]?.guideMidi;
    if (g === undefined) continue;
    const pool = byBar.get(b) ?? [];
    const candidates = pool.filter((n) => !isStructuralZappaSoloNote(n));
    if (candidates.length === 0) continue;
    candidates.sort((a, c) => a.startBeat - c.startBeat);
    const target = candidates[0]!;
    let iters = 0;
    while (iters < 8 && Math.abs(target.midi - g) > 3) {
      const step = target.midi < g ? 1 : -1;
      target.midi = liftIntoRange(target.midi + step, low, high);
      iters++;
    }
  }
}

function seededUnit(seed: number, salt: number): number {
  let s = ((seed ^ salt * 1103515245) >>> 0) as number;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

/**
 * Four-bar phrases aim at the guide tone two or four bars beyond the phrase end (deterministic).
 * When the closing note is farther from the goal than the opening note, nudge the last note inward.
 */
export function applyZappaPhraseGoalTargeting(
  allNotes: SoloNote[],
  tb: number,
  receipt: ZappaGuideToneReceipt,
  seed: number,
  low: number,
  high: number
): ZappaGuideToneReceipt['phraseTargets'] {
  const totalPhrases = Math.max(1, Math.ceil(tb / 4));
  const phraseTargets: NonNullable<ZappaGuideToneReceipt['phraseTargets']> = [];
  for (let pi = 0; pi < totalPhrases; pi++) {
    const lo = pi * 4 + 1;
    const hi = Math.min(tb, (pi + 1) * 4);
    const goalOffset = seededUnit(seed, 77000 + pi) < 0.5 ? 2 : 4;
    const goalBar = Math.min(tb, hi + goalOffset);
    const gRow = receipt.bars.find((x) => x.barIndex === goalBar);
    if (!gRow) continue;
    const goalMidi = gRow.guideMidi;
    const phraseNotes = allNotes
      .filter((n) => n.barIndex >= lo && n.barIndex <= hi && !isStructuralZappaSoloNote(n))
      .sort((a, b) => a.barIndex - b.barIndex || a.startBeat - b.startBeat);
    if (phraseNotes.length === 0) {
      phraseTargets.push({
        phraseIndex: pi,
        barRange: [lo, hi],
        goalBar,
        goalMidi,
        movedTowardGoal: true,
      });
      continue;
    }
    const first = phraseNotes[0]!;
    const last = phraseNotes[phraseNotes.length - 1]!;
    const dOpen = Math.abs(first.midi - goalMidi);
    const dClose = Math.abs(last.midi - goalMidi);
    let movedTowardGoal = dClose + 1e-3 < dOpen;
    if (!movedTowardGoal && dClose > dOpen) {
      let iters = 0;
      let cur = last.midi;
      while (iters < 10 && Math.abs(cur - goalMidi) > dOpen) {
        cur = liftIntoRange(cur + (cur < goalMidi ? 1 : -1), low, high);
        iters++;
      }
      last.midi = cur;
      movedTowardGoal = Math.abs(last.midi - goalMidi) + 1e-3 < dOpen;
    }
    phraseTargets.push({
      phraseIndex: pi,
      barRange: [lo, hi],
      goalBar,
      goalMidi,
      movedTowardGoal,
    });
  }
  return phraseTargets;
}
