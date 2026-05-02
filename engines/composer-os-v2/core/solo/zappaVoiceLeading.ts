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
      const dPref = Math.abs(guideMidi - prev);
      const altMidi = guideMidi === third ? seventh : third;
      const dAlt = Math.abs(altMidi - prev);
      if (dAlt + 1e-6 < dPref) {
        guideMidi = altMidi;
        role = guideMidi === third ? 'third' : 'seventh';
      }
      if (Math.abs(guideMidi - prev) > 2) {
        const cands = [
          { midi: third, r: 'third' as const },
          { midi: seventh, r: 'seventh' as const },
        ];
        let best = guideMidi;
        let bestR = role;
        let bestD = Math.abs(guideMidi - prev);
        for (const c of cands) {
          const d = Math.abs(c.midi - prev);
          if (d < bestD - 1e-6) {
            bestD = d;
            best = c.midi;
            bestR = c.r;
          }
        }
        guideMidi = best;
        role = bestR;
      }
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
