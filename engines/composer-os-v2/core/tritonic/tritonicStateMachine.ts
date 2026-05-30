/**
 * V104p4 — Tritonic phrase state machine (shared harmony + melody paths).
 * Always-on — no feature flag.
 */

import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import type { TritonicCell } from './tritonicCell';

export type TritonicContourType = 'step' | 'leap' | 'reversal' | 'static';

export type TritonicStateMachine = {
  previousCell: TritonicCell | null;
  unresolvedTones: PitchClass[];
  registralCentroid: number;
  lastContourType: TritonicContourType;
  tensionArc: { mean: number; peak: number };
  resolutionEligibility: number;
};

export function createTritonicStateMachine(): TritonicStateMachine {
  return {
    previousCell: null,
    unresolvedTones: [],
    registralCentroid: 0,
    lastContourType: 'static',
    tensionArc: { mean: 0, peak: 0 },
    resolutionEligibility: 1,
  };
}

function chordTonePcs(symbol: string): Set<number> {
  if (!symbol.trim()) return new Set();
  const tones = chordTonesForChordSymbol(symbol, { lockedHarmony: true });
  const pcs = new Set<number>();
  for (const midi of [tones.root, tones.third, tones.fifth, tones.seventh]) {
    pcs.add(((midi % 12) + 12) % 12);
  }
  return pcs;
}

function contourType(prevMidi: number | undefined, midi: number, priorContour: TritonicContourType): TritonicContourType {
  if (prevMidi === undefined) return 'static';
  const iv = midi - prevMidi;
  if (iv === 0) return 'static';
  const abs = Math.abs(iv);
  if (abs <= 2) {
    if (priorContour === 'step' || priorContour === 'static') return 'step';
    return 'reversal';
  }
  return 'leap';
}

function unresolvedPcsForCell(cell: TritonicCell, anchorSymbol: string, strandPc: number): PitchClass[] {
  const legal = chordTonePcs(anchorSymbol);
  const out = new Set<PitchClass>();
  for (const pc of cell.notes) {
    if (!legal.has(pc)) out.add(pc);
  }
  if (anchorSymbol.trim() && !legal.has(((strandPc % 12) + 12) % 12)) {
    out.add((((strandPc % 12) + 12) % 12) as PitchClass);
  }
  return [...out];
}

function mergeUnresolved(existing: readonly PitchClass[], next: readonly PitchClass[]): PitchClass[] {
  const merged = new Set<PitchClass>(existing);
  for (const pc of next) merged.add(pc);
  return [...merged];
}

function updateTensionArc(current: { mean: number; peak: number }, tension: number, sampleIndex: number): {
  mean: number;
  peak: number;
} {
  const mean = (current.mean * sampleIndex + tension) / (sampleIndex + 1);
  return { mean, peak: Math.max(current.peak, tension) };
}

function resolutionEligibilityScore(unresolvedCount: number, cellTension: number, meanTension: number): number {
  const unresolvedPenalty = Math.min(1, unresolvedCount / 6);
  const tensionPenalty = meanTension * 0.35 + cellTension * 0.15;
  const lowTensionBonus = cellTension < 0.5 ? 0.15 : 0;
  return Math.max(0, Math.min(1, 1 - unresolvedPenalty - tensionPenalty + lowTensionBonus));
}

export type RunTritonicStateMachineParams = {
  cells: readonly TritonicCell[];
  strandMidis: readonly number[];
  anchorBars?: readonly string[];
  harmonyBars?: readonly string[];
};

/**
 * Advance phrase memory across cell transitions (harmony + melody shared path).
 */
export function runTritonicStateMachine(params: RunTritonicStateMachineParams): TritonicStateMachine {
  const { cells, strandMidis, anchorBars, harmonyBars } = params;
  let state = createTritonicStateMachine();

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    const midi = strandMidis[i] ?? state.registralCentroid;
    const prevMidi = i > 0 ? strandMidis[i - 1] : undefined;
    const anchor = anchorBars?.[i] ?? harmonyBars?.[i] ?? '';

    const sampleIndex = i;
    state = {
      ...state,
      previousCell: cell,
      lastContourType: contourType(prevMidi, midi, state.lastContourType),
      registralCentroid:
        sampleIndex === 0
          ? midi
          : (state.registralCentroid * sampleIndex + midi) / (sampleIndex + 1),
      tensionArc: updateTensionArc(state.tensionArc, cell.tension, sampleIndex),
      unresolvedTones: mergeUnresolved(
        state.unresolvedTones,
        unresolvedPcsForCell(cell, anchor, midi),
      ),
      resolutionEligibility: resolutionEligibilityScore(
        mergeUnresolved(state.unresolvedTones, unresolvedPcsForCell(cell, anchor, midi)).length,
        cell.tension,
        updateTensionArc(state.tensionArc, cell.tension, sampleIndex).mean,
      ),
    };
  }

  return state;
}
