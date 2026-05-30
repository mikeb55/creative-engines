/**
 * V104p4 — Musical diagnostics for tritonic receipts.
 * Always-on — no feature flag.
 */

import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { TritonicCell } from './tritonicCell';
import {
  resolveTritonicBehaviourBiases,
  type TritonicBehaviourBiases,
} from './tritonicBehaviourBiases';
import {
  runTritonicStateMachine,
  type TritonicStateMachine,
} from './tritonicStateMachine';
import type { TritonicTimelineEvent } from './tritonicTimeline';
import { projectedStrandMidisFromCells } from './tritonicStrands';

export type RhythmicOffsetBucket = 'downbeat' | 'weak' | 'offbeat';

export type RhythmicOffsetDistribution = Record<RhythmicOffsetBucket, number>;

export type TritonicMusicalDiagnostics = {
  unresolvedToneCount: number;
  contourVariety: number;
  cadenceStrength: number;
  rhythmicOffsetDistribution: RhythmicOffsetDistribution;
};

function chordTonePcs(symbol: string): Set<number> {
  if (!symbol.trim()) return new Set();
  const tones = chordTonesForChordSymbol(symbol, { lockedHarmony: true });
  const pcs = new Set<number>();
  for (const midi of [tones.root, tones.third, tones.fifth, tones.seventh]) {
    pcs.add(((midi % 12) + 12) % 12);
  }
  return pcs;
}

function classifyRhythmicOffset(beat: number): RhythmicOffsetBucket {
  if (beat === 1) return 'downbeat';
  if (beat === 3) return 'weak';
  return 'offbeat';
}

export function computeRhythmicOffsetDistribution(
  timeline: readonly TritonicTimelineEvent[],
): RhythmicOffsetDistribution {
  const dist: RhythmicOffsetDistribution = { downbeat: 0, weak: 0, offbeat: 0 };
  for (const e of timeline) {
    dist[classifyRhythmicOffset(e.beat)]++;
  }
  return dist;
}

export function computeContourVariety(strandMidis: readonly number[]): number {
  if (strandMidis.length < 2) return 0;
  const dirs = strandMidis.slice(1).map((m, i) => Math.sign(m - strandMidis[i]!));
  let changes = 0;
  for (let i = 1; i < dirs.length; i++) {
    if (dirs[i] !== dirs[i - 1] && dirs[i] !== 0 && dirs[i - 1] !== 0) changes++;
  }
  return dirs.length <= 1 ? 0 : changes / (dirs.length - 1);
}

export function computeCadenceStrength(
  strandMidis: readonly number[],
  finalAnchorSymbol: string,
): number {
  if (strandMidis.length === 0 || !finalAnchorSymbol.trim()) return 0;
  const tones = chordTonePcs(finalAnchorSymbol);
  const last = strandMidis[strandMidis.length - 1]!;
  const lastPc = ((last % 12) + 12) % 12;
  const inChord = tones.has(lastPc) ? 0.4 : 0;

  let stepBonus = 0;
  if (strandMidis.length >= 2) {
    const step = Math.abs(strandMidis[strandMidis.length - 1]! - strandMidis[strandMidis.length - 2]!);
    if (step <= 2) stepBonus = 0.3;
    else if (step <= 4) stepBonus = 0.15;
  }

  const tonePcs = [...tones];
  const nearest = tonePcs.length
    ? Math.min(...tonePcs.map((t) => Math.min(Math.abs(lastPc - t), 12 - Math.abs(lastPc - t))))
    : 6;
  const proximity = 1 - Math.min(nearest, 6) / 6;
  return Math.min(1, inChord + stepBonus + proximity * 0.3);
}

function countUnresolvedAcrossPhrase(
  cells: readonly TritonicCell[],
  strandMidis: readonly number[],
  anchorBars?: readonly string[],
  harmonyBars?: readonly string[],
): number {
  let count = 0;
  for (let i = 0; i < cells.length; i++) {
    const anchor = anchorBars?.[i] ?? harmonyBars?.[i] ?? '';
    const legal = chordTonePcs(anchor);
    if (!anchor.trim()) continue;
    const midi = strandMidis[i];
    if (midi !== undefined && !legal.has(((midi % 12) + 12) % 12)) count++;
    for (const pc of cells[i]!.notes) {
      if (!legal.has(pc)) count++;
    }
  }
  return count;
}

export type ComputeTritonicDiagnosticsParams = {
  cells: readonly TritonicCell[];
  timeline: readonly TritonicTimelineEvent[];
  anchorBars?: readonly string[];
  harmonyBars?: readonly string[];
  strandMidis?: readonly number[];
  phraseState?: TritonicStateMachine;
  behaviourBiases?: Partial<TritonicBehaviourBiases>;
};

export function computeTritonicMusicalDiagnostics(
  params: ComputeTritonicDiagnosticsParams,
): { diagnostics: TritonicMusicalDiagnostics; phraseState: TritonicStateMachine } {
  const strandMidis = params.strandMidis ?? projectedStrandMidisFromCells(params.cells);
  const behaviourBiases = resolveTritonicBehaviourBiases(params.behaviourBiases);
  const phraseState =
    params.phraseState ??
    runTritonicStateMachine({
      cells: params.cells,
      strandMidis,
      anchorBars: params.anchorBars,
      harmonyBars: params.harmonyBars,
      behaviourBiases,
    });

  const finalAnchor =
    params.anchorBars?.[params.anchorBars.length - 1] ??
    params.harmonyBars?.[params.harmonyBars.length - 1] ??
    '';

  const diagnostics: TritonicMusicalDiagnostics = {
    unresolvedToneCount: countUnresolvedAcrossPhrase(
      params.cells,
      strandMidis,
      params.anchorBars,
      params.harmonyBars,
    ),
    contourVariety: computeContourVariety(strandMidis),
    cadenceStrength: computeCadenceStrength(strandMidis, finalAnchor),
    rhythmicOffsetDistribution: computeRhythmicOffsetDistribution(params.timeline),
  };

  return { diagnostics, phraseState };
}

/** Receipt fields shared by vault + melody completion kinds. */
export function tritonicDiagnosticsReceiptFields(
  params: ComputeTritonicDiagnosticsParams,
): TritonicMusicalDiagnostics & { phraseState: TritonicStateMachine } {
  const { diagnostics, phraseState } = computeTritonicMusicalDiagnostics(params);
  return { ...diagnostics, phraseState };
}
