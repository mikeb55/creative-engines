/**
 * Shared MotifShape — single abstraction for Song Mode hook statement/return identity
 * (generator + validator aligned).
 */

import type { PartModel } from '../score-model/scoreModelTypes';
import { getChordForBar } from '../harmony/harmonyResolution';
import { guitarChordTonesInRange } from '../goldenPath/guitarPhraseAuthority';
import { clampPitch } from '../goldenPath/guitarBassDuoHarmony';
import { snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';
import { chordTonesForChordSymbol, type ChordTonesOptions } from '../harmony/chordSymbolAnalysis';
import type { CompositionContext } from '../compositionContext';
import { shouldUseUserChordSemanticsForTones } from '../harmony/harmonyChordTonePolicy';

const VALIDATOR_LOW = 55;
const VALIDATOR_HIGH = 79;

/** Touching same-pitch atoms after finalize / notation-safe split — merge for identity validation only (does not write score). */
const VALIDATOR_TOUCH_EPS = 1e-3;

/**
 * Collapse consecutive same-pitch notes that abut in time (notation-safe splits). Preserves start of first atom; extends duration.
 * Input must be time-sorted by startBeat.
 */
export function mergeTouchingSamePitchNotesForValidator(
  notes: Array<{ pitch: number; startBeat: number; duration: number }>
): Array<{ pitch: number; startBeat: number; duration: number }> {
  if (notes.length === 0) return [];
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  const out: Array<{ pitch: number; startBeat: number; duration: number }> = [];
  let cur = { ...sorted[0]! };
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i]!;
    const curEnd = cur.startBeat + cur.duration;
    if (n.pitch === cur.pitch && n.startBeat <= curEnd + VALIDATOR_TOUCH_EPS) {
      const nEnd = n.startBeat + n.duration;
      cur.duration = Math.max(curEnd, nEnd) - cur.startBeat;
    } else {
      out.push(cur);
      cur = { ...n };
    }
  }
  out.push(cur);
  return out;
}

function intervalsFromPitches(pitches: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < pitches.length; i++) out.push(pitches[i] - pitches[i - 1]);
  return out;
}

function rootPcFromChordSymbol(chord: string, opts?: ChordTonesOptions): number {
  const t = chordTonesForChordSymbol(chord, opts);
  return ((Math.round(t.root) % 12) + 12) % 12;
}

/** Shortest signed semitone delta between two chord roots (same as common harmonic transposition). */
function shortestRootPcDelta(pc1: number, pc2: number): number {
  let d = pc2 - pc1;
  if (d > 6) d -= 12;
  if (d < -6) d += 12;
  return d;
}

function intervalPatternSimilarityVec(a: number[], b: number[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const mag = 1 - Math.min(1, Math.abs(a[i] - b[i]) / 8);
    const dir = Math.sign(a[i]) === Math.sign(b[i]) ? 1 : 0;
    s += 0.65 * mag + 0.35 * dir;
  }
  return s / Math.max(a.length, b.length);
}

function contourMatch(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let hit = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === b[i]) hit++;
  return hit / a.length;
}

function attackPatternSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const da = Math.abs(a[i] - b[i]);
    s += 1 - Math.min(1, da * 3);
  }
  return s / Math.max(a.length, b.length);
}

function anchorSimilarity(a: MotifShape, b: MotifShape): number {
  let s = 0;
  if (a.startRelativePc === b.startRelativePc) s += 0.34;
  if (a.peakIndex === b.peakIndex) s += 0.33;
  if (a.peakRelativePc === b.peakRelativePc) s += 0.33;
  return s;
}

export interface MotifShape {
  /** Pitch-class offset from local chord root (0–11). */
  startRelativePc: number;
  /** Index of highest pitch in the phrase. */
  peakIndex: number;
  /** Peak pitch-class offset from local chord root (0–11). */
  peakRelativePc: number;
  /** Consecutive semitone intervals. */
  intervalPattern: number[];
  /** Per-step contour: 1 / -1 / 0. */
  contour: number[];
  /** Snapped attack beats (one per note). */
  attackBeats: number[];
}

export function motifShapeWithReturnAttacks(
  base: MotifShape,
  returnRhythm: { start: number; dur: number }[]
): MotifShape {
  const n = base.attackBeats.length;
  const attackBeats = returnRhythm.slice(0, n).map((r) => snapAttackBeatToGrid(r.start));
  return { ...base, attackBeats };
}

export function extractMotifShapeFromStatement(
  pitches: number[],
  stmtRh: { start: number; dur: number }[],
  chord: string,
  low: number,
  high: number,
  chordToneOpts?: ChordTonesOptions
): MotifShape {
  const n = Math.min(pitches.length, stmtRh.length);
  const p = pitches.slice(0, n);
  const tones = guitarChordTonesInRange(chord, low, high, chordToneOpts);
  const rootMidi = Math.round(tones.root);
  const rootPc = ((rootMidi % 12) + 12) % 12;
  const ivs = intervalsFromPitches(p);
  const contour = ivs.map((iv) => (iv > 0 ? 1 : iv < 0 ? -1 : 0));
  let peakIx = 0;
  for (let i = 1; i < p.length; i++) {
    if (p[i] > p[peakIx]) peakIx = i;
  }
  const startPc = ((p[0] % 12) + 12) % 12;
  const peakPc = ((p[peakIx] % 12) + 12) % 12;
  const startRelativePc = (startPc - rootPc + 12) % 12;
  const peakRelativePc = (peakPc - rootPc + 12) % 12;
  const attackBeats: number[] = [];
  for (let i = 0; i < n; i++) attackBeats.push(snapAttackBeatToGrid(stmtRh[i].start));
  return {
    startRelativePc,
    peakIndex: peakIx,
    peakRelativePc,
    intervalPattern: ivs,
    contour,
    attackBeats,
  };
}

export function extractMotifShapeFromGuitarBar(
  guitar: PartModel,
  bar: number,
  chord: string,
  low: number,
  high: number,
  chordToneOpts?: ChordTonesOptions
): MotifShape | null {
  const m = guitar.measures.find((x) => x.index === bar);
  if (!m) return null;
  const raw = m.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { pitch: number; startBeat: number; duration: number })
    .sort((a, b) => a.startBeat - b.startBeat);
  const notes = mergeTouchingSamePitchNotesForValidator(raw);
  if (notes.length < 2) return null;
  const pitches = notes.map((n) => n.pitch);
  const stmtRh = notes.map((n) => ({ start: n.startBeat, dur: n.duration }));
  return extractMotifShapeFromStatement(pitches, stmtRh, chord, low, high, chordToneOpts);
}

export function extractMotifShapeFromGuitarBarContext(
  guitar: PartModel,
  bar: number,
  context: CompositionContext
): MotifShape | null {
  const opts = shouldUseUserChordSemanticsForTones(context) ? { lockedHarmony: true } : undefined;
  const chord = getChordForBar(bar, context);
  return extractMotifShapeFromGuitarBar(guitar, bar, chord, VALIDATOR_LOW, VALIDATOR_HIGH, opts);
}

/** Same weights as simMotifToRealization family: interval primary, rhythm + anchors supporting. */
export function similarityMotifShape(a: MotifShape, b: MotifShape): number {
  const wInt = 0.5;
  const wCont = 0.15;
  const wRhy = 0.25;
  const wAnch = 0.1;
  const intSim = intervalPatternSimilarityVec(a.intervalPattern, b.intervalPattern);
  const contSim = contourMatch(a.contour, b.contour);
  const rhySim = attackPatternSimilarity(a.attackBeats, b.attackBeats);
  const anchSim = anchorSimilarity(a, b);
  return wInt * intSim + wCont * contSim + wRhy * rhySim + wAnch * anchSim;
}

/** Interval + contour + anchors only (for bar 1 vs stored statement when rhythm grid may differ post-normalize). */
export function similarityMotifShapePitchStructure(a: MotifShape, b: MotifShape): number {
  const wInt = 0.55;
  const wCont = 0.2;
  const wAnch = 0.25;
  const intSim = intervalPatternSimilarityVec(a.intervalPattern, b.intervalPattern);
  const contSim = contourMatch(a.contour, b.contour);
  const anchSim = anchorSimilarity(a, b);
  return wInt * intSim + wCont * contSim + wAnch * anchSim;
}

/**
 * Shift entire phrase by octaves so all notes sit in [low, high]; preserves semitone intervals.
 * Scans a wider k range so narrow register windows still find a fit without per-note clamp.
 */
function transposeOctavesToFit(
  pitches: number[],
  low: number,
  high: number,
  hintForFirst: number
): number[] | null {
  if (pitches.length === 0) return pitches;
  const minP = Math.min(...pitches);
  const maxP = Math.max(...pitches);
  if (maxP - minP > high - low + 1e-6) return null;
  let best: number[] | null = null;
  let bestD = Infinity;
  for (let k = -8; k <= 8; k++) {
    const shifted = pitches.map((p) => p + 12 * k);
    if (!shifted.every((p) => p >= low && p <= high)) continue;
    const d = Math.abs(shifted[0] - hintForFirst);
    if (d < bestD - 1e-6) {
      bestD = d;
      best = shifted;
    }
  }
  return best;
}

/**
 * Identity-first: transpose the actual statement pitch sequence by harmonic root movement (symbol-based PCs).
 * Preserves interval pattern and contour class; octave shift only to fit register — no chord-tone pool resnap.
 * Anti-literal variation is rhythm-only (see return micro-variation), not pitch nudging here.
 */
export function realizeReturnMidiFromMotifShape(
  _shape: MotifShape,
  statementPitches: number[],
  chord1: string,
  chord25: string,
  statementP0: number,
  zLow: number,
  zHigh: number,
  _seed: number,
  chordToneOpts?: ChordTonesOptions
): number[] {
  if (statementPitches.length === 0) return [];
  const r1pc = rootPcFromChordSymbol(chord1, chordToneOpts);
  const r25pc = rootPcFromChordSymbol(chord25, chordToneOpts);
  const delta = shortestRootPcDelta(r1pc, r25pc);
  const raw = statementPitches.map((p) => p + delta);
  const hint = clampPitch(statementP0 + delta, zLow, zHigh);
  const fitted = transposeOctavesToFit(raw, zLow, zHigh, hint);
  if (fitted) return fitted;
  return raw.map((p) => clampPitch(p, zLow, zHigh));
}
