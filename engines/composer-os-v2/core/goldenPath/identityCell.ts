/**
 * ECM chamber — identity cell: extract from A1, transform in B, restate in A2.
 * Pitch-only on interior notes; note count and durations unchanged; post-pass VL + contour guards.
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel, PartModel, NoteEvent, MeasureModel } from '../score-model/scoreModelTypes';
import { guitarChordTonesInRange } from './guitarPhraseAuthority';
import { enforceEcmPostEditGuards } from './ecmShapingPass';
import { seededUnit } from './guitarBassDuoHarmony';

const G_LOW = 55;
const G_HIGH = 79;

export interface IdentityCell {
  intervals: number[];
  /** Relative duration weights (same length as note count used), sum arbitrary. */
  rhythm: number[];
  /** Scale degree class (0–11) of first extracted pitch. */
  anchorDegree?: number;
}

function chordForBar(context: CompositionContext, barIndex: number, mChord?: string): string {
  if (mChord && mChord.trim()) return mChord.trim();
  for (const seg of context.chordSymbolPlan.segments) {
    if (barIndex >= seg.startBar && barIndex < seg.startBar + seg.bars) return seg.chord;
  }
  throw new Error(`identityCell: no chord for bar ${barIndex}`);
}

function guitarPart(score: ScoreModel): PartModel | undefined {
  return score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
}

function sectionRange(
  context: CompositionContext,
  label: 'A1' | 'B' | 'A2'
): { start: number; end: number } | undefined {
  const s = context.form.sections.find((sec) => sec.label === label);
  if (!s) return undefined;
  return { start: s.startBar, end: s.startBar + s.length - 1 };
}

function sortedNotesInMeasure(m: MeasureModel): NoteEvent[] {
  return [...m.events]
    .filter((e): e is NoteEvent => e.kind === 'note')
    .sort((a, b) => a.startBeat - b.startBeat);
}

function snapToChordToneNear(pitch: number, chord: string, prevPitch: number, maxLeap: number): number {
  const pool = guitarChordTonesInRange(chord, G_LOW, G_HIGH);
  const candidates = [pool.root, pool.third, pool.fifth, pool.seventh].map((x) => Math.round(x));
  let best = pitch;
  let bd = 999;
  for (const c of candidates) {
    const cc = Math.max(G_LOW, Math.min(G_HIGH, c));
    if (Math.abs(cc - prevPitch) > maxLeap) continue;
    const d = Math.abs(cc - pitch);
    if (d < bd) {
      bd = d;
      best = cc;
    }
  }
  if (bd < 999) return best;
  const step = Math.sign(pitch - prevPitch) * Math.min(Math.abs(pitch - prevPitch), maxLeap);
  return Math.max(G_LOW, Math.min(G_HIGH, prevPitch + step));
}

/**
 * First A section (A1): first measure with ≥3 guitar notes; take 3–5 notes, intervals + rhythm shape.
 */
export function extractIdentityCellFromA(score: ScoreModel, context: CompositionContext): IdentityCell {
  const g = guitarPart(score);
  const a1 = sectionRange(context, 'A1');
  if (!g || !a1) return { intervals: [], rhythm: [] };

  for (let bar = a1.start; bar <= a1.end; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (!m) continue;
    const notes = sortedNotesInMeasure(m);
    if (notes.length < 3) continue;
    const take = Math.min(5, Math.max(3, notes.length));
    const slice = notes.slice(0, take);
    const intervals: number[] = [];
    for (let i = 1; i < slice.length; i++) {
      intervals.push(slice[i].pitch - slice[i - 1].pitch);
    }
    const rhythm = slice.map((n) => n.duration);
    const sum = rhythm.reduce((a, b) => a + b, 0) || 1;
    const rhythmNorm = rhythm.map((r) => r / sum);
    return {
      intervals,
      rhythm: rhythmNorm,
      anchorDegree: slice[0].pitch % 12,
    };
  }

  return { intervals: [], rhythm: [] };
}

function barNoteIndices(m: MeasureModel): number[] {
  const idx: number[] = [];
  m.events.forEach((e, i) => {
    if (e.kind === 'note') idx.push(i);
  });
  return idx;
}

/**
 * B section: one phrase (one bar), interior pitches only — transposition + small interval nudge; contour sign preserved.
 */
export function applyCellToB(score: ScoreModel, cell: IdentityCell, context: CompositionContext, seed: number): void {
  if (context.presetId !== 'ecm_chamber' || cell.intervals.length === 0) return;
  const g = guitarPart(score);
  const br = sectionRange(context, 'B');
  if (!g || !br) return;

  const transpose =
    Math.round((seededUnit(seed, 3, 55100) - 0.5) * 4) + Math.round((seededUnit(seed, 4, 55101) - 0.5) * 2);

  let bestBar: MeasureModel | undefined;
  let bestIdxs: number[] = [];
  let bestCount = 0;
  for (let bar = br.start; bar <= br.end; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (!m) continue;
    const ni = barNoteIndices(m);
    if (ni.length >= 4 && ni.length > bestCount) {
      bestCount = ni.length;
      bestBar = m;
      bestIdxs = ni;
    }
  }
  if (!bestBar || bestIdxs.length < 4) {
    for (let bar = br.start; bar <= br.end; bar++) {
      const m = g.measures.find((x) => x.index === bar);
      if (!m) continue;
      const ni = barNoteIndices(m);
      if (ni.length >= 3 && ni.length > bestCount) {
        bestCount = ni.length;
        bestBar = m;
        bestIdxs = ni;
      }
    }
  }
  if (!bestBar || bestIdxs.length < 3) return;

  const chord = chordForBar(context, bestBar.index, bestBar.chord);
  const nIn = bestIdxs.length;
  for (let k = 1; k <= nIn - 2; k++) {
    const ci = Math.min(k - 1, cell.intervals.length - 1);
    const baseIv = cell.intervals[ci];
    const sign = baseIv === 0 ? 1 : Math.sign(baseIv);
    const nudge = seededUnit(seed, k + bestBar.index * 10, 55102) < 0.5 ? 0 : sign;
    const delta = baseIv + transpose + nudge;
    const prevEv = bestBar.events[bestIdxs[k - 1]] as NoteEvent;
    const curEv = bestBar.events[bestIdxs[k]] as NoteEvent;
    const target = prevEv.pitch + delta;
    const snapped = snapToChordToneNear(target, chord, prevEv.pitch, 5);
    if (snapped !== curEv.pitch) {
      bestBar.events[bestIdxs[k]] = { ...curEv, pitch: snapped };
    }
  }
}

/**
 * A2: one restatement closer to original (smaller transpose), sparse bar preferred.
 */
export function reinforceCellInAprime(
  score: ScoreModel,
  cell: IdentityCell,
  context: CompositionContext,
  seed: number = context.seed
): void {
  if (context.presetId !== 'ecm_chamber' || cell.intervals.length === 0) return;
  const g = guitarPart(score);
  const ar = sectionRange(context, 'A2');
  if (!g || !ar) return;

  const transpose = Math.round((seededUnit(seed, 5, 55200) - 0.5) * 2);

  let pickBar: number | undefined;
  let minNotes = 999;
  for (let bar = ar.start; bar <= ar.end; bar++) {
    const m = g.measures.find((x) => x.index === bar);
    if (!m) continue;
    const n = barNoteIndices(m).length;
    if (n >= 4 && n < minNotes) {
      minNotes = n;
      pickBar = bar;
    }
  }
  if (pickBar === undefined) {
    for (let bar = ar.start; bar <= ar.end; bar++) {
      const m = g.measures.find((x) => x.index === bar);
      if (!m) continue;
      const n = barNoteIndices(m).length;
      if (n >= 3) {
        pickBar = bar;
        break;
      }
    }
  }
  if (pickBar === undefined) return;

  const m = g.measures.find((x) => x.index === pickBar);
  if (!m) return;
  const idxs = barNoteIndices(m);
  if (idxs.length < 3) return;
  const chord = chordForBar(context, m.index, m.chord);
  const nIn = idxs.length;
  for (let k = 1; k <= nIn - 2; k++) {
    const ci = Math.min(k - 1, cell.intervals.length - 1);
    const delta = cell.intervals[ci] + transpose;
    const prevEv = m.events[idxs[k - 1]] as NoteEvent;
    const curEv = m.events[idxs[k]] as NoteEvent;
    const target = prevEv.pitch + delta;
    const snapped = snapToChordToneNear(target, chord, prevEv.pitch, 5);
    if (snapped !== curEv.pitch) {
      m.events[idxs[k]] = { ...curEv, pitch: snapped };
    }
  }
}

/** Re-run ECM guitar/bass VL + contour guards after identity-cell pitch edits. */
export function applyIdentityCellPostEditGuards(score: ScoreModel, context: CompositionContext, seed: number): void {
  enforceEcmPostEditGuards(score, context, seed);
}

export function applyEcmIdentityCellPass(
  score: ScoreModel,
  context: CompositionContext,
  seed: number
): void {
  if (context.presetId !== 'ecm_chamber') return;
  const cell = extractIdentityCellFromA(score, context);
  applyCellToB(score, cell, context, seed);
  reinforceCellInAprime(score, cell, context, seed);
  applyIdentityCellPostEditGuards(score, context, seed);
}

/** Contour sign string for interval pattern (e.g. +/-/+). */
export function cellContourSign(cell: IdentityCell): string {
  return cell.intervals.map((iv) => (iv > 0 ? '+' : iv < 0 ? '-' : '0')).join('');
}

/** Count bar-level 3-note windows whose contour sign matches the cell prefix (length ≥2 intervals). */
export function countCellContourMatchesInGuitar(score: ScoreModel, cell: IdentityCell): number {
  const want = cellContourSign(cell);
  if (want.length < 2) return 0;
  const g = guitarPart(score);
  if (!g) return 0;
  let count = 0;
  for (const m of g.measures) {
    const notes = sortedNotesInMeasure(m);
    for (let i = 0; i + 2 < notes.length; i++) {
      const a = notes[i].pitch;
      const b = notes[i + 1].pitch;
      const c = notes[i + 2].pitch;
      const s1 = b > a ? '+' : b < a ? '-' : '0';
      const s2 = c > b ? '+' : c < b ? '-' : '0';
      if (`${s1}${s2}` === want.slice(0, 2)) count++;
    }
  }
  return count;
}
