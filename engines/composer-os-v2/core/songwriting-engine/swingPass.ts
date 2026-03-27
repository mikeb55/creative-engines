/**
 * Composer OS V2 — Songwriting Engine Phase 2: Swingometer (rhythm-only).
 * Modifies start/duration of note and rest events; never changes pitch.
 */

import type { MeasureModel, ScoreModel } from '../score-model/scoreModelTypes';
import { DIVISIONS, MEASURE_DIVISIONS } from '../score-model/scoreModelTypes';

const TICKS_PER_BEAT = DIVISIONS;
const MEASURE_TICKS = MEASURE_DIVISIONS;
const EPS = 1e-6;
const MIN_TICKS = 24;

type TickSeg =
  | { s: number; e: number; kind: 'rest'; voice?: number }
  | { s: number; e: number; kind: 'note'; pitch: number; voice?: number };

function roundBeat(b: number): number {
  return Math.round(b * 1e6) / 1e6;
}

function mergeAdjacentRests(segs: TickSeg[]): TickSeg[] {
  const out: TickSeg[] = [];
  for (const seg of segs) {
    if (seg.e <= seg.s) continue;
    const last = out[out.length - 1];
    if (seg.kind === 'rest' && last && last.kind === 'rest' && last.e === seg.s) {
      last.e = seg.e;
      continue;
    }
    out.push({ ...seg });
  }
  return out;
}

function eventsToSegments(measure: MeasureModel): TickSeg[] {
  const sorted = [...measure.events].sort((a, b) => a.startBeat - b.startBeat);
  const out: TickSeg[] = [];
  let cursor = 0;
  for (const e of sorted) {
    const s = Math.round(e.startBeat * TICKS_PER_BEAT);
    const d = Math.round(e.duration * TICKS_PER_BEAT);
    const end = s + d;
    if (s > cursor) {
      out.push({ s: cursor, e: s, kind: 'rest' });
    }
    if (e.kind === 'note') {
      out.push({ s, e: end, kind: 'note', pitch: e.pitch, voice: e.voice });
    } else {
      out.push({ s, e: end, kind: 'rest', voice: e.voice });
    }
    cursor = end;
  }
  if (cursor < MEASURE_TICKS) {
    out.push({ s: cursor, e: MEASURE_TICKS, kind: 'rest' });
  }
  return mergeAdjacentRests(out);
}

function segmentsToMeasure(measure: MeasureModel, segs: TickSeg[]): void {
  measure.events = [];
  for (const seg of segs) {
    if (seg.e <= seg.s) continue;
    const sb = roundBeat(seg.s / TICKS_PER_BEAT);
    const dur = roundBeat((seg.e - seg.s) / TICKS_PER_BEAT);
    if (dur <= EPS) continue;
    if (seg.kind === 'note') {
      measure.events.push({
        kind: 'note',
        pitch: seg.pitch,
        startBeat: sb,
        duration: dur,
        voice: seg.voice ?? 1,
      });
    } else {
      measure.events.push({
        kind: 'rest',
        startBeat: sb,
        duration: dur,
        voice: seg.voice ?? 1,
      });
    }
  }
}

function shouldModifyBoundary(partIdx: number, measureIdx: number, boundaryIdx: number, level: number): boolean {
  if (level <= 0) return false;
  const h = (partIdx * 928371 + measureIdx * 793 + boundaryIdx * 31 + level * 17) >>> 0;
  const thresholdPct = [0, 0.12, 0.28, 0.5, 0.72, 0.88][level];
  return (h % 1000) / 1000 < thresholdPct;
}

function boundarySign(partIdx: number, measureIdx: number, boundaryIdx: number, level: number): 1 | -1 {
  const h = (partIdx * 1234567 + measureIdx * 17 + boundaryIdx * 101 + level) >>> 0;
  return h % 2 === 0 ? 1 : -1;
}

function maxDeltaTicks(level: number, leftLen: number, rightLen: number): number {
  const cap = [0, 10, 22, 36, 52, 68][level];
  const minSide = Math.min(leftLen, rightLen);
  const maxShift = Math.min(cap, Math.floor(minSide / 2) - MIN_TICKS);
  return Math.max(0, maxShift);
}

function applyBoundaryShift(left: TickSeg, right: TickSeg, B: number, deltaTicks: number): TickSeg[] | null {
  const d = deltaTicks;
  if (d === 0) return null;
  if (left.e !== B || right.s !== B) return null;
  if (d > 0) {
    if (left.e - left.s < d || right.e - right.s < d) return null;
    const l2: TickSeg =
      left.kind === 'note'
        ? { s: left.s, e: B - d, kind: 'note', pitch: left.pitch, voice: left.voice }
        : { s: left.s, e: B - d, kind: 'rest', voice: left.voice };
    const mid: TickSeg = { s: B - d, e: B + d, kind: 'rest' };
    /** Delay: right starts later; original segment end tick unchanged so the bar stays MEASURE_TICKS. */
    const r2: TickSeg =
      right.kind === 'note'
        ? { s: B + d, e: right.e, kind: 'note', pitch: right.pitch, voice: right.voice }
        : { s: B + d, e: right.e, kind: 'rest', voice: right.voice };
    return [l2, mid, r2];
  }
  const dAbs = -d;
  if (left.e - left.s < dAbs || right.e - right.s < dAbs) return null;
  const l2: TickSeg =
    left.kind === 'note'
      ? { s: left.s, e: B - dAbs, kind: 'note', pitch: left.pitch, voice: left.voice }
      : { s: left.s, e: B - dAbs, kind: 'rest', voice: left.voice };
  /** Anticipation: earlier attack; left shortens, right lengthens so measure length is preserved. */
  const r2: TickSeg =
    right.kind === 'note'
      ? { s: B - dAbs, e: right.e, kind: 'note', pitch: right.pitch, voice: right.voice }
      : { s: B - dAbs, e: right.e, kind: 'rest', voice: right.voice };
  return [l2, r2];
}

function findBoundaryIndexAtTick(segArr: TickSeg[], B: number): number {
  for (let i = 0; i < segArr.length - 1; i++) {
    const L = segArr[i];
    const R = segArr[i + 1];
    if (L && R && L.e === B && R.s === B) return i;
  }
  return -1;
}

function applySwingToSegments(
  segs: TickSeg[],
  partIdx: number,
  measureIdx: number,
  level: number
): TickSeg[] {
  if (level <= 0 || segs.length < 2) return segs;
  const initial = mergeAdjacentRests([...segs]);
  const meta: { B: number; bidx: number }[] = [];
  for (let i = 0; i < initial.length - 1; i++) {
    const L = initial[i];
    const R = initial[i + 1];
    if (L && R && L.e === R.s) meta.push({ B: L.e, bidx: i });
  }
  meta.sort((a, b) => b.B - a.B);

  let segArr = initial;
  for (const { B, bidx } of meta) {
    if (!shouldModifyBoundary(partIdx, measureIdx, bidx, level)) continue;
    const idx = findBoundaryIndexAtTick(segArr, B);
    if (idx < 0) continue;
    const left = segArr[idx];
    const right = segArr[idx + 1];
    if (!left || !right || left.e !== B || right.s !== B) continue;
    const sign = boundarySign(partIdx, measureIdx, bidx, level);
    const maxD = maxDeltaTicks(level, left.e - left.s, right.e - right.s);
    if (maxD <= 0) continue;
    const delta = sign * maxD;
    const replaced = applyBoundaryShift(left, right, B, delta);
    if (!replaced) continue;
    segArr.splice(idx, 2, ...replaced);
    segArr = mergeAdjacentRests(segArr);
  }

  let total = 0;
  for (const s of segArr) total += s.e - s.s;
  if (Math.abs(total - MEASURE_TICKS) > 2) {
    return initial;
  }
  return segArr;
}

/**
 * Deterministic swing shaping on the eighth-note-friendly grid (integer ticks).
 * Level 0 = no-op. Levels 1–5 increase displacement density and magnitude.
 * Does not read or modify pitch; only rest/note timing.
 */
export function applySwingPass(score: ScoreModel, level: number): void {
  const L = Math.max(0, Math.min(5, Math.floor(level)));
  if (L === 0) return;

  score.parts.forEach((part, partIdx) => {
    part.measures.forEach((measure, mi) => {
      const raw = eventsToSegments(measure);
      const swung = applySwingToSegments(raw, partIdx, measure.index - 1, L);
      segmentsToMeasure(measure, swung);
    });
  });
}
