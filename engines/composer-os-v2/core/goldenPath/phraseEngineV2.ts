/**
 * Phrase engine V2 — motif pool extraction hook (golden path).
 */

import {
  applyMotifMutation,
  extractMotifCell,
  scoreMotifSimilarity as scoreMutationMotifSimilarity,
  selectMotifTransform,
  type MotifNoteLite,
  type MutationMotifCell,
} from '../song-mode/motifMutationEngine';
import type {
  ScoreModel,
  PartModel,
  NoteEvent,
  ScoreEvent,
  ChordEvent,
  MeasureModel,
} from '../score-model/scoreModelTypes';
import type { SongModeHookIdentity } from '../motif/motifEngineTypes';

/** Short melodic/rhythmic fragment candidate. */
export type MotifContour = 'up' | 'down' | 'arch' | 'flat';

export interface MotifCell {
  pitches: number[];
  durations: number[];
  contour: MotifContour;
  /** 0–1; mechanical extraction uses fixed mapping (no salience analysis yet). */
  weight: number;
}

export interface MotifPool {
  cells: MotifCell[];
  generationId: string;
}

/**
 * Minimal context for motif-pool generation (extend when wired to `runGoldenPath`).
 */
export interface GoldenPathContext {
  /** Stable id for correlating pools with a run. */
  generationId?: string;
  seed?: number;
  /** Primary extracted motif cell for mutation diagnostics / downstream receipts. */
  primaryMotifCell?: MutationMotifCell;
}

/** Phrase length in bars (aligned with Song Mode phrase segmentation). */
export const PHRASE_ENGINE_V2_PHRASE_BARS = 4;

/** Number of leading phrases to slice for the motif pool. */
export const PHRASE_ENGINE_V2_PHRASE_COUNT = 4;

/** Development / second-half region for rhythmic recall + pitch nudge (32-bar Song Mode). */
export const PHRASE_ENGINE_V2_DEVELOPMENT_LO = 17;
export const PHRASE_ENGINE_V2_DEVELOPMENT_HI = 32;

const DURATION_MATCH_EPS = 1e-3;

function isNoteEvent(ev: ScoreEvent): ev is NoteEvent {
  return ev.kind === 'note';
}

function findGuitarPart(score: ScoreModel): PartModel | undefined {
  return score.parts.find((p) => p.id === 'guitar');
}

function classifyContourTwo(p0: number, p1: number): MotifContour {
  const d = p1 - p0;
  if (d > 1) return 'up';
  if (d < -1) return 'down';
  return 'flat';
}

interface TaggedNote {
  bar: number;
  n: NoteEvent;
}

function sortedNotesInBarRange(part: PartModel, startBar: number, endBar: number): TaggedNote[] {
  const out: TaggedNote[] = [];
  for (const m of part.measures) {
    if (m.index < startBar || m.index > endBar) continue;
    for (const ev of m.events) {
      if (isNoteEvent(ev)) out.push({ bar: m.index, n: ev });
    }
  }
  out.sort((a, b) => (a.bar !== b.bar ? a.bar - b.bar : a.n.startBeat - b.n.startBeat));
  return out;
}

function mechanicalCellFromFirstTwoNotes(tagged: TaggedNote[]): MotifCell {
  if (tagged.length === 0) {
    return { pitches: [], durations: [], contour: 'flat', weight: 0 };
  }
  if (tagged.length === 1) {
    const n = tagged[0]!.n;
    return {
      pitches: [n.pitch],
      durations: [n.duration],
      contour: 'flat',
      weight: 1,
    };
  }
  const a = tagged[0]!.n;
  const b = tagged[1]!.n;
  const pitches = [a.pitch, b.pitch];
  const durations = [a.duration, b.duration];
  return {
    pitches,
    durations,
    contour: classifyContourTwo(pitches[0]!, pitches[1]!),
    weight: 1,
  };
}

function poolGenerationId(context: GoldenPathContext): string {
  if (context.generationId && context.generationId.length > 0) return context.generationId;
  return `phrase-engine-v2:${context.seed ?? 0}`;
}

function cloneScoreEvent(ev: ScoreEvent): ScoreEvent {
  if (ev.kind === 'note') {
    const n = ev as NoteEvent;
    return {
      ...n,
      ...(n.pitches && n.pitches.length > 0 ? { pitches: [...n.pitches] } : {}),
    };
  }
  if (ev.kind === 'chord') {
    const c = ev as ChordEvent;
    return { ...c, pitches: [...c.pitches] };
  }
  return { ...ev };
}

function clonePartModel(part: PartModel): PartModel {
  return {
    ...part,
    measures: part.measures.map(
      (m): MeasureModel => ({
        ...m,
        events: m.events.map(cloneScoreEvent),
      })
    ),
  };
}

interface NoteRef {
  mi: number;
  ei: number;
}

function collectSortedNoteRefs(part: PartModel, startBar: number, endBar: number): NoteRef[] {
  const refs: NoteRef[] = [];
  for (let mi = 0; mi < part.measures.length; mi++) {
    const m = part.measures[mi]!;
    if (m.index < startBar || m.index > endBar) continue;
    for (let ei = 0; ei < m.events.length; ei++) {
      const ev = m.events[ei]!;
      if (isNoteEvent(ev)) refs.push({ mi, ei });
    }
  }
  refs.sort((a, b) => {
    const ma = part.measures[a.mi]!;
    const mb = part.measures[b.mi]!;
    if (ma.index !== mb.index) return ma.index - mb.index;
    const na = part.measures[a.mi]!.events[a.ei] as NoteEvent;
    const nb = part.measures[b.mi]!.events[b.ei] as NoteEvent;
    return na.startBeat - nb.startBeat;
  });
  return refs;
}

function durationsMatchFigure(notes: NoteEvent[], pattern: number[]): boolean {
  if (notes.length !== pattern.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (Math.abs(notes[i]!.duration - pattern[i]!) > DURATION_MATCH_EPS) return false;
  }
  return true;
}

/** Move `actual` toward `target` by at most one semitone (no forced equality). */
function stepTowardPitch(actual: number, target: number): number {
  if (actual === target) return actual;
  if (actual < target) return actual + 1;
  return actual - 1;
}

function nearestMidiCarryingPc(currentMidi: number, pc: number): number {
  const curPc = ((currentMidi % 12) + 12) % 12;
  let delta = (((pc - curPc + 12) % 12) + 12) % 12;
  if (delta > 6) delta -= 12;
  return currentMidi + delta;
}

function sectionRoleForDevelopmentBar(bar: number): import('../song-mode/motifMutationEngine').SectionRole {
  if (bar <= 20) return 'B';
  if (bar <= 24) return 'bridge';
  if (bar <= 28) return 'A2';
  return 'coda';
}

function primaryMutationCellFromPool(pool: MotifPool): MutationMotifCell | undefined {
  for (const cell of pool.cells) {
    if (cell.weight <= 0) continue;
    if (cell.pitches.length < 2) continue;
    const notes: MotifNoteLite[] = cell.pitches.map((p, i) => ({
      pitch: p,
      duration: cell.durations[i] ?? 1,
    }));
    return extractMotifCell(notes, notes.length);
  }
  return undefined;
}

export interface PhraseEngineV2ApplyOptions {
  seed?: number;
}

/**
 * Mechanical extraction: first two notes (score order) from each of the first four 4-bar phrases
 * of the guitar part. Exactly four {@link MotifCell}s (empty phrases yield empty cells).
 */
export function buildMotifPool(score: ScoreModel, context: GoldenPathContext): MotifPool {
  const guitar = findGuitarPart(score);
  const generationId = poolGenerationId(context);

  const emptyCell = (): MotifCell => ({ pitches: [], durations: [], contour: 'flat', weight: 0 });

  if (!guitar) {
    return {
      cells: [emptyCell(), emptyCell(), emptyCell(), emptyCell()],
      generationId,
    };
  }

  const cells: MotifCell[] = [];
  for (let ph = 0; ph < PHRASE_ENGINE_V2_PHRASE_COUNT; ph++) {
    const startBar = ph * PHRASE_ENGINE_V2_PHRASE_BARS + 1;
    const endBar = startBar + PHRASE_ENGINE_V2_PHRASE_BARS - 1;
    const tagged = sortedNotesInBarRange(guitar, startBar, endBar);
    cells.push(mechanicalCellFromFirstTwoNotes(tagged));
  }

  return { cells, generationId };
}

/**
 * Appends one hook-seeded {@link MotifCell} from {@link SongModeHookIdentity} (flat contour, weight 0.8).
 * Does not mutate {@link pool}.
 */
export function seedPoolFromHookIdentity(pool: MotifPool, hookIdentity: SongModeHookIdentity): MotifPool {
  const root = hookIdentity.rootPitch;
  const rp = hookIdentity.rhythmicProfile;
  let cell: MotifCell;
  if (rp.length >= 2) {
    cell = {
      pitches: [root, root],
      durations: [rp[0]!.dur, rp[1]!.dur],
      contour: 'flat',
      weight: 0.8,
    };
  } else if (rp.length === 1) {
    cell = {
      pitches: [root],
      durations: [rp[0]!.dur],
      contour: 'flat',
      weight: 0.8,
    };
  } else {
    cell = {
      pitches: [root, root],
      durations: [1, 1],
      contour: 'flat',
      weight: 0.8,
    };
  }
  return {
    generationId: pool.generationId,
    cells: [...pool.cells, cell],
  };
}

/**
 * For each pool cell with weight > 0, finds the first matching duration-only figure in bars 17–32 and
 * nudges those note pitches one semitone toward the cell targets. Other notes unchanged.
 * Does not mutate {@link part}; returns a deep-cloned part with edits.
 */
export function applyPhraseEngineV2(
  part: PartModel,
  pool: MotifPool,
  opts?: PhraseEngineV2ApplyOptions
): PartModel {
  let out = clonePartModel(part);
  const refs = collectSortedNoteRefs(out, PHRASE_ENGINE_V2_DEVELOPMENT_LO, PHRASE_ENGINE_V2_DEVELOPMENT_HI);

  for (const cell of pool.cells) {
    if (cell.weight <= 0) continue;
    const patLen = Math.min(cell.durations.length, cell.pitches.length);
    if (patLen === 0) continue;
    const pattern = cell.durations.slice(0, patLen);
    const targets = cell.pitches.slice(0, patLen);

    for (let start = 0; start + patLen <= refs.length; start++) {
      const slice = refs.slice(start, start + patLen);
      const notes = slice.map((r) => out.measures[r.mi]!.events[r.ei] as NoteEvent);
      if (!durationsMatchFigure(notes, pattern)) continue;

      for (let j = 0; j < patLen; j++) {
        const r = slice[j]!;
        const ev = out.measures[r.mi]!.events[r.ei] as NoteEvent;
        const nextPitch = stepTowardPitch(ev.pitch, targets[j]!);
        out.measures[r.mi]!.events[r.ei] = { ...ev, pitch: nextPitch };
      }
      break;
    }
  }

  const seed = opts?.seed ?? 0;
  const primary = primaryMutationCellFromPool(pool);
  if (primary) {
    const devStarts = [17, 21, 25, 29];
    for (const bar of devStarts) {
      const role = sectionRoleForDevelopmentBar(bar);
      const tr = selectMotifTransform(role, seed + bar * 131);
      const mutated = applyMotifMutation(primary, tr);
      const sim = scoreMutationMotifSimilarity(primary, mutated);
      if (sim < 0.3 || (sim > 0.95 && sim < 0.999)) {
        console.warn(
          `[PhraseEngineV2] motif mutation similarity=${sim.toFixed(3)} transform=${String(tr)} role=${role}`
        );
      }
      const refsBar = collectSortedNoteRefs(out, bar, bar);
      const first = refsBar[0];
      if (first && mutated.pitchClasses.length > 0) {
        const ev = out.measures[first.mi]!.events[first.ei] as NoteEvent;
        const targetPc = mutated.pitchClasses[0]!;
        const goal = nearestMidiCarryingPc(ev.pitch, targetPc);
        const stepped = stepTowardPitch(ev.pitch, goal);
        out.measures[first.mi]!.events[first.ei] = { ...ev, pitch: stepped };
      }
    }
  }

  return out;
}

function lowestPitchInCell(cell: MotifCell): number | undefined {
  if (cell.pitches.length === 0) return undefined;
  return Math.min(...cell.pitches);
}

function durationMatchesAnyCellDuration(noteDur: number, cellDurations: number[]): boolean {
  for (const d of cellDurations) {
    if (Math.abs(noteDur - d) <= DURATION_MATCH_EPS) return true;
  }
  return false;
}

/**
 * Per weighted pool cell: first bass note in bars 17–32 whose duration matches any {@link MotifCell.durations}
 * entry is nudged ±1 semitone toward the lowest pitch in {@link MotifCell.pitches}. One edit per cell max.
 */
export function applyBassMotifEcho(bassPart: PartModel, pool: MotifPool): PartModel {
  const out = clonePartModel(bassPart);
  const refs = collectSortedNoteRefs(out, PHRASE_ENGINE_V2_DEVELOPMENT_LO, PHRASE_ENGINE_V2_DEVELOPMENT_HI);

  for (const cell of pool.cells) {
    if (cell.weight <= 0) continue;
    const targetLow = lowestPitchInCell(cell);
    if (targetLow === undefined || !Number.isFinite(targetLow)) continue;
    if (cell.durations.length === 0) continue;

    for (const r of refs) {
      const ev = out.measures[r.mi]!.events[r.ei] as NoteEvent;
      if (!durationMatchesAnyCellDuration(ev.duration, cell.durations)) continue;
      const nextPitch = stepTowardPitch(ev.pitch, targetLow);
      out.measures[r.mi]!.events[r.ei] = { ...ev, pitch: nextPitch };
      break;
    }
  }

  return out;
}
