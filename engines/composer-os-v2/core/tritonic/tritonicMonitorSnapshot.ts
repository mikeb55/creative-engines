/**
 * V1.5p9 — Tritonic monitor snapshot for Harmonic Float + Melodic Trace UI.
 * Always-on — no feature flag.
 */

import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { TritonicCell, TritonicCellFamily } from './tritonicCell';
import type { TritonicMusicalDiagnostics } from './tritonicDiagnostics';
import {
  advanceTritonicState,
  createTritonicStateMachine,
  type TritonicStateMachine,
} from './tritonicStateMachine';
import { extractTritonicStrands, projectedStrandMidisFromCells } from './tritonicStrands';
import type { TritonicTimelineEvent } from './tritonicTimeline';
import type { TritonicBehaviourBiases } from './tritonicBehaviourBiases';
import { resolveTritonicBehaviourBiases } from './tritonicBehaviourBiases';

export type TritonicColumnColour = 'stable' | 'colouristic' | 'unresolved' | 'cadence-eligible';

export type TritonicResolutionBadge = 'locked' | 'near' | 'eligible' | 'resolving';

export type TritonicMonitorColumn = {
  columnIndex: number;
  bar: number;
  beat: number;
  anchorSymbol: string;
  cellFamily: TritonicCellFamily;
  cellGlyph: string;
  colourState: TritonicColumnColour;
  registralCentroid: number;
  voicingTopMidi: number;
  projectedStrandMidi: number;
  singerSafeMidi: number;
  tension: number;
  unresolvedCount: number;
  resolutionEligibility: number;
  resolutionBadge: TritonicResolutionBadge;
};

export type TritonicMonitorSnapshot = {
  mode?: string;
  columns: readonly TritonicMonitorColumn[];
  /** Per-column tension for sparkline (same order as columns). */
  tensionSeries: readonly number[];
  /** Index ranges [start,end) into tensionSeries for last two phrases. */
  phraseSpans: readonly { start: number; end: number }[];
  phraseState: TritonicStateMachine;
  diagnostics: TritonicMusicalDiagnostics;
};

const FAMILY_GLYPH: Record<TritonicCellFamily, string> = {
  quartal: 'Q4',
  cluster: 'Cl',
  suspended: 'Sus',
  shorter_floating: 'Fl',
  bergonzi: 'Bg',
};

function resolutionBadge(score: number): TritonicResolutionBadge {
  if (score >= 0.75) return 'resolving';
  if (score >= 0.5) return 'eligible';
  if (score >= 0.25) return 'near';
  return 'locked';
}

function cellGlyph(cell: TritonicCell): string {
  const pcs = [...cell.notes].sort((a, b) => a - b).join('·');
  return `${FAMILY_GLYPH[cell.family]} ${pcs}`;
}

function columnColourState(
  cell: TritonicCell,
  unresolvedCount: number,
  resolutionEligibility: number,
): TritonicColumnColour {
  if (unresolvedCount > 0) return 'unresolved';
  if (resolutionEligibility >= 0.65) return 'cadence-eligible';
  if (cell.tension >= 0.55 || cell.family === 'cluster' || cell.family === 'bergonzi') {
    return 'colouristic';
  }
  return 'stable';
}

function unresolvedCountForCell(cell: TritonicCell, anchor: string, strandMidi: number): number {
  if (!anchor.trim()) return 0;
  const tones = chordTonesForChordSymbol(anchor, { lockedHarmony: true });
  const legal = new Set<number>();
  for (const midi of [tones.root, tones.third, tones.fifth, tones.seventh]) {
    legal.add(((midi % 12) + 12) % 12);
  }
  let count = 0;
  for (const pc of cell.notes) {
    if (!legal.has(pc)) count++;
  }
  const strandPc = ((strandMidi % 12) + 12) % 12;
  if (!legal.has(strandPc)) count++;
  return count;
}

function phraseSpansForColumnCount(
  columnCount: number,
  phraseCount: number,
): { start: number; end: number }[] {
  if (columnCount <= 0 || phraseCount <= 0) return [];
  const perPhrase = Math.max(1, Math.ceil(columnCount / phraseCount));
  const spans: { start: number; end: number }[] = [];
  for (let p = 0; p < phraseCount; p++) {
    const start = p * perPhrase;
    const end = Math.min(columnCount, (p + 1) * perPhrase);
    if (start < end) spans.push({ start, end });
  }
  return spans.slice(-2);
}

export type BuildTritonicMonitorSnapshotParams = {
  timeline: readonly TritonicTimelineEvent[];
  cells: readonly TritonicCell[];
  anchorBars?: readonly string[];
  harmonyBars?: readonly string[];
  phraseState: TritonicStateMachine;
  diagnostics: TritonicMusicalDiagnostics;
  mode?: string;
  phraseCount?: number;
  behaviourBiases?: Partial<TritonicBehaviourBiases>;
};

export function buildTritonicMonitorSnapshot(params: BuildTritonicMonitorSnapshotParams): TritonicMonitorSnapshot {
  const biases = resolveTritonicBehaviourBiases(params.behaviourBiases);
  const chain = params.cells.length > 0 ? params.cells : params.timeline.map((e) => e.cell);
  const strands = extractTritonicStrands(params.timeline, chain);
  const strandMidis = projectedStrandMidisFromCells(chain);

  const columns: TritonicMonitorColumn[] = [];
  const tensionSeries: number[] = [];
  let state = createTritonicStateMachine();

  for (let i = 0; i < chain.length; i++) {
    const cell = chain[i]!;
    const anchor =
      params.anchorBars?.[i] ?? params.harmonyBars?.[i] ?? params.timeline[i]?.bar?.toString() ?? '';
    const anchorSymbol = typeof anchor === 'string' ? anchor : String(anchor ?? '');
    const midi = strandMidis[i] ?? strands.projectedStrand[i]?.midi ?? 60;
    state = advanceTritonicState({
      state,
      cell,
      midi,
      prevMidi: i > 0 ? strandMidis[i - 1] : undefined,
      anchor: anchorSymbol,
      sampleIndex: i,
      behaviourBiases: biases,
    });
    const unresolvedCount = unresolvedCountForCell(cell, anchorSymbol, midi);
    const ev = params.timeline[i];
    const colourState = columnColourState(cell, unresolvedCount, state.resolutionEligibility);
    tensionSeries.push(cell.tension);
    columns.push({
      columnIndex: i,
      bar: ev?.bar ?? i + 1,
      beat: ev?.beat ?? 1,
      anchorSymbol,
      cellFamily: cell.family,
      cellGlyph: cellGlyph(cell),
      colourState,
      registralCentroid: state.registralCentroid,
      voicingTopMidi: strands.voicingTop[i]?.midi ?? midi,
      projectedStrandMidi: strands.projectedStrand[i]?.midi ?? midi,
      singerSafeMidi: strands.singerSafeMotif[i]?.midi ?? midi,
      tension: cell.tension,
      unresolvedCount,
      resolutionEligibility: state.resolutionEligibility,
      resolutionBadge: resolutionBadge(state.resolutionEligibility),
    });
  }

  const phraseCount = params.phraseCount ?? (params.mode === 'sq' ? 2 : 1);
  const phraseSpans = phraseSpansForColumnCount(columns.length, phraseCount);

  return {
    mode: params.mode,
    columns,
    tensionSeries,
    phraseSpans,
    phraseState: params.phraseState,
    diagnostics: params.diagnostics,
  };
}
