/**
 * Song Mode — Phrase Engine v2 (phrase-state generation; guitar melody only).
 * Motif span protection: pitches/timing of motif occurrences are immutable except phrase-final cadence
 * (duration extend + chord snap ±2 semitones). Non-motif notes get full phrase shaping.
 * Runs after motif emission, before orchestration. Validation unchanged (v1 checks).
 */

import type { CompositionContext } from '../compositionContext';
import type { Motif } from '../motif/motifEngineTypes';
import type { MeasureModel, PartModel, ScoreEvent } from '../score-model/scoreModelTypes';
import { createRest } from '../score-model/scoreEventBuilder';
import { shouldUseUserChordSemanticsForTones } from '../harmony/harmonyChordTonePolicy';
import { getChordForBar } from '../harmony/harmonyResolution';
import { guitarChordTonesInRange } from './guitarPhraseAuthority';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';
import { normalizeMeasureToEighthBeatGrid, snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';
import type { ChordTonesOptions } from '../harmony/chordSymbolAnalysis';

const TB = 32;
const PHRASE_LEN = 4;
const PHRASE_COUNT = TB / PHRASE_LEN;

const LOW = 55;
const HIGH = 79;

/** Max semitones to snap phrase-final landing toward chord tone (cadence, filler only). */
const LANDING_SNAP_MAX_SEMIS = 2;

export interface SongModePhraseSegment {
  startBar: number;
  endBar: number;
  regionIndex: number;
  phraseIndexInRegion: number;
}

export function songModePhraseSegments(): SongModePhraseSegment[] {
  const out: SongModePhraseSegment[] = [];
  for (let p = 0; p < PHRASE_COUNT; p++) {
    const startBar = p * PHRASE_LEN + 1;
    const endBar = startBar + PHRASE_LEN - 1;
    const regionIndex = Math.floor((startBar - 1) / 8);
    const phraseIndexInRegion = Math.floor(((startBar - 1) % 8) / PHRASE_LEN);
    out.push({ startBar, endBar, regionIndex, phraseIndexInRegion });
  }
  return out;
}

function chordToneOpts(context: CompositionContext): ChordTonesOptions | undefined {
  return shouldUseUserChordSemanticsForTones(context) ? { lockedHarmony: true } : undefined;
}

function tonesForBar(bar: number, context: CompositionContext) {
  const opts = chordToneOpts(context);
  return guitarChordTonesInRange(getChordForBar(bar, context), LOW, HIGH, opts);
}

function poolMidi(bar: number, context: CompositionContext): number[] {
  const t = tonesForBar(bar, context);
  return [t.root, t.third, t.fifth, t.seventh].map((x) => Math.round(x));
}

function nearestPool(want: number, bar: number, context: CompositionContext): number {
  const pool = poolMidi(bar, context);
  let best = pool[0];
  let bd = Math.abs(want - best);
  for (const p of pool) {
    const d = Math.abs(want - p);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return clampPitch(best, LOW, HIGH);
}

/** Nearest chord tone strictly above `prev` (ascend without plateau). */
function nearestPoolStrictlyAbove(prev: number, bar: number, context: CompositionContext): number {
  const pool = poolMidi(bar, context);
  let best: number | undefined;
  let bd = 999;
  for (const p of pool) {
    if (p <= prev) continue;
    const d = Math.abs(p - (prev + 1));
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  if (best !== undefined) return clampPitch(best, LOW, HIGH);
  return clampPitch(prev + 1, LOW, HIGH);
}

/** Nearest chord tone strictly below `prev` (descend without upward snap). */
function nearestPoolStrictlyBelow(prev: number, bar: number, context: CompositionContext): number {
  const pool = poolMidi(bar, context);
  let best: number | undefined;
  let bd = 999;
  for (const p of pool) {
    if (p >= prev) continue;
    const d = Math.abs(p - (prev - 1));
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  if (best !== undefined) return clampPitch(best, LOW, HIGH);
  return clampPitch(prev - 1, LOW, HIGH);
}

function motifCycleLength(primary: Motif | undefined): number {
  if (primary?.rhythm?.length) return primary.rhythm.length;
  return 4;
}

/** One span per bar: first `motifLen` notes in that bar (time order) = one motif occurrence. */
function buildMotifSpans(
  phraseNotes: ReturnType<typeof collectPhraseNotes>,
  motifLen: number
): [number, number][] {
  const spans: [number, number][] = [];
  let i = 0;
  while (i < phraseNotes.length) {
    const b = phraseNotes[i].bar;
    const barIdxs: number[] = [];
    while (i < phraseNotes.length && phraseNotes[i].bar === b) {
      barIdxs.push(i);
      i++;
    }
    const take = Math.min(motifLen, barIdxs.length);
    if (take > 0) spans.push([barIdxs[0], barIdxs[take - 1]]);
  }
  return spans;
}

function noteIsInMotifSpan(noteIndex: number, spans: [number, number][]): boolean {
  for (const [a, b] of spans) {
    if (noteIndex >= a && noteIndex <= b) return true;
  }
  return false;
}

/** Collect notes in time order across bars [startBar, endBar]. */
function collectPhraseNotes(
  guitar: PartModel,
  startBar: number,
  endBar: number
): Array<{
  bar: number;
  pitch: number;
  startBeat: number;
  duration: number;
  measure: MeasureModel;
  eventIndex: number;
}> {
  const out: Array<{
    bar: number;
    pitch: number;
    startBeat: number;
    duration: number;
    measure: MeasureModel;
    eventIndex: number;
  }> = [];
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    m.events.forEach((e, eventIndex) => {
      if (e.kind !== 'note') return;
      const n = e as { pitch: number; startBeat: number; duration: number };
      out.push({ bar: b, pitch: n.pitch, startBeat: n.startBeat, duration: n.duration, measure: m, eventIndex });
    });
  }
  out.sort((a, b) => (a.bar - b.bar) || a.startBeat - b.startBeat);
  return out;
}

function measureHasRestOnGrid(m: MeasureModel): boolean {
  return m.events.some((e) => e.kind === 'rest');
}

/** Contour steps: +1 up, -1 down, 0 same. */
function contourSteps(pitches: number[]): number[] {
  const s: number[] = [];
  for (let i = 1; i < pitches.length; i++) {
    const d = pitches[i] - pitches[i - 1];
    s.push(d > 0 ? 1 : d < 0 ? -1 : 0);
  }
  return s;
}

function hasDirectionalRunThree(pitches: number[]): boolean {
  const steps = contourSteps(pitches);
  if (steps.length < 3) return false;
  for (let i = 0; i <= steps.length - 3; i++) {
    const a = steps[i];
    const b = steps[i + 1];
    const c = steps[i + 2];
    if (a !== 0 && a === b && b === c) return true;
  }
  return false;
}

function peakIndex(pitches: number[]): number {
  let p = 0;
  for (let i = 1; i < pitches.length; i++) {
    if (pitches[i] > pitches[p]) p = i;
  }
  return p;
}

function peakPrecededByTwoUps(pitches: number[]): boolean {
  const p = peakIndex(pitches);
  if (p < 2) return false;
  return pitches[p - 2] < pitches[p - 1] && pitches[p - 1] < pitches[p];
}

function multiplePeaksAmbiguous(pitches: number[]): boolean {
  if (pitches.length === 0) return false;
  const mx = Math.max(...pitches);
  const ix = pitches.map((x, i) => (x === mx ? i : -1)).filter((i) => i >= 0);
  if (ix.length <= 1) return false;
  for (let a = 0; a < ix.length; a++) {
    for (let b = a + 1; b < ix.length; b++) {
      if (ix[b] - ix[a] > 1) return true;
    }
  }
  return false;
}

function hasTwoDownStepsAfterPeak(pitches: number[], peak: number): boolean {
  const steps = contourSteps(pitches);
  for (let i = peak; i <= steps.length - 2; i++) {
    if (steps[i] === -1 && steps[i + 1] === -1) return true;
  }
  return false;
}

function downStepsCountAfterPeak(pitches: number[], peak: number): number {
  let c = 0;
  for (let i = peak; i < pitches.length - 1; i++) {
    if (pitches[i + 1] < pitches[i]) c++;
  }
  return c;
}

function descentFromPeakToEnd(pitches: number[], peak: number): boolean {
  if (peak >= pitches.length - 1) return false;
  for (let i = peak; i < pitches.length - 1; i++) {
    const d = pitches[i + 1] - pitches[i];
    if (d > 0) return false;
    if (d < 0 && Math.abs(d) > 4) return false;
  }
  return pitches[pitches.length - 1] < pitches[peak];
}

function maxBarDirectionChanges(guitar: PartModel, startBar: number, endBar: number): number {
  let maxCh = 0;
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    const notes = m.events
      .filter((e) => e.kind === 'note')
      .map((e) => e as { pitch: number; startBeat: number })
      .sort((x, y) => x.startBeat - y.startBeat);
    const pp = notes.map((n) => n.pitch);
    if (pp.length < 2) continue;
    const steps = contourSteps(pp);
    let changes = 0;
    let prev = 0;
    for (const st of steps) {
      if (st === 0) continue;
      if (prev !== 0 && st !== prev) changes++;
      prev = st;
    }
    maxCh = Math.max(maxCh, changes);
  }
  return maxCh;
}

function nearestChordToneMidi(pitch: number, poolMidiArr: number[]): { pitch: number; dist: number } {
  let best = poolMidiArr[0];
  let bestD = Math.abs(pitch - best);
  for (const p of poolMidiArr) {
    const d = Math.abs(pitch - p);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return { pitch: best, dist: bestD };
}

function extendLastNoteCadence(m: MeasureModel, minDur: number): void {
  let lastNoteI = -1;
  for (let i = m.events.length - 1; i >= 0; i--) {
    if (m.events[i].kind === 'note') {
      lastNoteI = i;
      break;
    }
  }
  if (lastNoteI < 0) return;
  const note = m.events[lastNoteI] as { startBeat: number; duration: number };
  const tailRest = m.events.find(
    (e, i) => i > lastNoteI && e.kind === 'rest' && (e as { startBeat: number }).startBeat >= note.startBeat - 1e-4
  ) as { startBeat: number; duration: number } | undefined;
  const room = 4 - note.startBeat;
  let want = Math.max(note.duration, minDur);
  want = Math.min(room, want);
  if (tailRest) {
    const maxAbsorb = tailRest.startBeat + tailRest.duration - (note.startBeat + note.duration);
    if (maxAbsorb > 1e-4) {
      const add = Math.min(maxAbsorb, Math.max(0, want - note.duration));
      note.duration = snapAttackBeatToGrid(note.duration + add);
      const newRestStart = note.startBeat + note.duration;
      tailRest.startBeat = newRestStart;
      tailRest.duration = snapAttackBeatToGrid(4 - newRestStart);
      if (tailRest.duration <= 1e-4) {
        const ri = m.events.indexOf(tailRest as ScoreEvent);
        if (ri >= 0) m.events.splice(ri, 1);
      }
    } else {
      note.duration = snapAttackBeatToGrid(Math.min(room, want));
    }
  } else {
    note.duration = snapAttackBeatToGrid(Math.min(room, want));
  }
}

function snapPhraseLandingToChordTone(m: MeasureModel, context: CompositionContext, bar: number): void {
  const opts = chordToneOpts(context);
  const chord = getChordForBar(bar, context);
  const gtones = guitarChordTonesInRange(chord, 40, 90, opts);
  const pool = [gtones.root, gtones.third, gtones.fifth, gtones.seventh].map((x) => Math.round(x));
  let lastNoteI = -1;
  for (let i = m.events.length - 1; i >= 0; i--) {
    if (m.events[i].kind === 'note') {
      lastNoteI = i;
      break;
    }
  }
  if (lastNoteI < 0) return;
  const n = m.events[lastNoteI] as { pitch: number };
  const { pitch: tgt, dist } = nearestChordToneMidi(n.pitch, pool);
  if (dist <= LANDING_SNAP_MAX_SEMIS && dist > 0) n.pitch = tgt;
}

function emphasizeCadenceDuration(m: MeasureModel): void {
  const notes = m.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { duration: number; startBeat: number })
    .sort((a, b) => a.startBeat - b.startBeat);
  if (notes.length < 2) return;
  const last = notes[notes.length - 1];
  const prev = notes[notes.length - 2];
  const target = Math.max(last.duration, prev.duration * 1.5);
  const room = 4 - last.startBeat;
  last.duration = snapAttackBeatToGrid(Math.min(room, target));
}

function rhythmDurSignature(guitar: PartModel, startBar: number, endBar: number): string {
  const parts: string[] = [];
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind === 'note') {
        parts.push(String(Math.round((e as { duration: number }).duration * 1000) / 1000));
      }
    }
  }
  return parts.join(',');
}

function shapePhraseOpening(
  m: MeasureModel,
  phraseIndex: number,
  context: CompositionContext,
  startBar: number
): void {
  const opts = chordToneOpts(context);
  const notes = m.events
    .map((e, i) => ({ e, i }))
    .filter((x) => x.e.kind === 'note')
    .sort((a, b) => (a.e as { startBeat: number }).startBeat - (b.e as { startBeat: number }).startBeat);
  if (notes.length === 0) return;
  const first = notes[0].e as { startBeat: number; duration: number; pitch: number };
  if (phraseIndex % 2 === 0) {
    if (first.startBeat < 0.01 && !measureHasRestOnGrid(m)) {
      const shift = 0.5;
      if (first.duration <= shift + 0.25) return;
      first.startBeat = shift;
      first.duration = snapAttackBeatToGrid(first.duration - shift);
      m.events.unshift(createRest(0, shift));
    }
  } else if (first.startBeat < 0.01 && notes.length >= 2) {
    const second = notes[1].e as { startBeat: number; duration: number };
    if (Math.abs(second.startBeat - 1) < 0.1) {
      second.startBeat = snapAttackBeatToGrid(1.25);
      const gap = second.startBeat - first.startBeat - first.duration;
      if (gap > 1e-3) {
        m.events.push(createRest(snapAttackBeatToGrid(first.startBeat + first.duration), gap));
      }
    }
  }
  const chord = getChordForBar(startBar, context);
  const tones = guitarChordTonesInRange(chord, LOW, HIGH, opts);
  const set = new Set([tones.root, tones.third, tones.fifth, tones.seventh].map((x) => Math.round(x)));
  const lastN = notes[notes.length - 1].e as { pitch: number; startBeat: number; duration: number };
  if (lastN.duration < 1 - 1e-4 && set.has(Math.round(lastN.pitch))) {
    extendLastNoteCadence(m, 1);
  }
}

function cadenceTargetLowMidi(bar: number, context: CompositionContext): number {
  const t = tonesForBar(bar, context);
  const candidates = [t.root, t.third, t.fifth].map((x) => Math.round(x));
  let best = candidates[0];
  for (const c of candidates) {
    if (c <= LOW + 12 && Math.abs(c - LOW) < Math.abs(best - LOW)) best = c;
  }
  return clampPitch(best, LOW, HIGH);
}

interface PhrasePlan {
  peakIdx: number;
  cadenceMidi: number;
}

function planPhraseShape(n: number, seed: number, phraseIdx: number): PhrasePlan {
  const u = seededUnit(seed, phraseIdx, 91000);
  // Bias peak later in the phrase: room for ≥2 upward steps before peak and a real tail descent.
  const raw = Math.floor(n * (0.45 + u * 0.25));
  const peakIdx = Math.max(2, Math.min(n - 3, raw));
  return { peakIdx, cadenceMidi: 0 };
}

/** Pick chord tone in [low, high] closest to `prefer`, else strict fallback. */
function nearestPoolInWindow(
  prefer: number,
  bar: number,
  context: CompositionContext,
  low: number,
  high: number
): number {
  const pool = poolMidi(bar, context);
  let best: number | undefined;
  let bd = 999;
  for (const p of pool) {
    if (p < low || p > high) continue;
    const d = Math.abs(p - prefer);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  if (best !== undefined) return clampPitch(best, LOW, HIGH);
  return clampPitch(Math.round((low + high) / 2), LOW, HIGH);
}

/**
 * Phrase-state pitch generation: only mutates pitches for indices outside motif spans; rhythm untouched.
 */
function generatePhraseStatePitches(
  pitches: number[],
  spans: [number, number][],
  phraseNotes: ReturnType<typeof collectPhraseNotes>,
  peakIdx: number,
  context: CompositionContext,
  seed: number,
  phraseIdx: number,
  cadenceMidi: number
): void {
  const n = pitches.length;
  let smallDownUsed = false;

  for (let i = 1; i < peakIdx; i++) {
    if (noteIsInMotifSpan(i, spans)) continue;
    const bar = phraseNotes[i].bar;
    const prev = pitches[i - 1];
    let want = prev + 1 + (seededUnit(seed, phraseIdx, i) < 0.35 ? 1 : 0);
    if (seededUnit(seed, phraseIdx, i + 400) < 0.08 && !smallDownUsed && i > 1) {
      want = prev - 1;
      smallDownUsed = true;
    }
    let p = nearestPool(want, bar, context);
    if (p <= prev) p = nearestPoolStrictlyAbove(prev, bar, context);
    pitches[i] = p;
  }

  if (!noteIsInMotifSpan(peakIdx, spans)) {
    const bar = phraseNotes[peakIdx].bar;
    const prev = pitches[peakIdx - 1];
    const midHigh = Math.round((prev + HIGH) / 2);
    let want = Math.max(prev + 2, midHigh);
    let p = nearestPool(want, bar, context);
    if (p <= prev) p = nearestPoolStrictlyAbove(prev, bar, context);
    for (let j = 0; j < peakIdx; j++) {
      if (p <= pitches[j]) p = clampPitch(pitches[j] + 2, LOW, HIGH);
    }
    pitches[peakIdx] = p;
  }

  const mxOthers = Math.max(...pitches.map((p, j) => (j === peakIdx ? -999 : p)));
  if (!noteIsInMotifSpan(peakIdx, spans) && pitches[peakIdx] <= mxOthers) {
    pitches[peakIdx] = clampPitch(mxOthers + 2, LOW, HIGH);
  }
  for (let j = 0; j < n; j++) {
    if (j === peakIdx) continue;
    if (!noteIsInMotifSpan(j, spans) && pitches[j] >= pitches[peakIdx])
      pitches[j] = clampPitch(pitches[peakIdx] - 1, LOW, HIGH);
  }

  // --- Descent: backward from cadence so the landing is among the lowest pitches after the peak (suffix min).
  if (!noteIsInMotifSpan(n - 1, spans)) {
    const barL = phraseNotes[n - 1].bar;
    let fin = nearestPool(cadenceMidi, barL, context);
    const peakP = pitches[peakIdx];
    if (fin >= peakP) fin = nearestPoolStrictlyBelow(peakP, barL, context);
    pitches[n - 1] = fin;
  }

  for (let i = n - 2; i > peakIdx; i--) {
    if (noteIsInMotifSpan(i, spans)) continue;
    const bar = phraseNotes[i].bar;
    const lowBound = pitches[i + 1];
    const highBound = pitches[i - 1];
    const maxStep = 4;
    if (highBound <= lowBound + 1) {
      pitches[i] = clampPitch(lowBound, LOW, HIGH);
      continue;
    }
    const preferDown = seededUnit(seed, phraseIdx, i + 500) < 0.35 ? 2 : 1;
    let target = Math.max(lowBound, highBound - maxStep - preferDown);
    target = Math.min(highBound - 1, target);
    if (target < lowBound) target = lowBound;
    const hiClamp = Math.min(highBound - 1, lowBound + maxStep);
    let p = nearestPoolInWindow(target, bar, context, lowBound, hiClamp);
    if (p >= highBound) p = nearestPoolStrictlyBelow(highBound, bar, context);
    if (p < lowBound) p = lowBound;
    if (highBound - p > maxStep) p = clampPitch(highBound - maxStep, LOW, HIGH);
    if (p < lowBound) p = lowBound;
    pitches[i] = p;
  }

  // Forward repair: no upward moves after peak (validator descent path), and first two contour steps down when possible.
  for (let i = peakIdx + 1; i < n; i++) {
    if (noteIsInMotifSpan(i, spans)) continue;
    const prev = pitches[i - 1];
    const bar = phraseNotes[i].bar;
    if (pitches[i] > prev) {
      pitches[i] = nearestPoolStrictlyBelow(prev, bar, context);
    }
  }

  if (!noteIsInMotifSpan(peakIdx + 1, spans) && peakIdx + 2 < n) {
    const pk = pitches[peakIdx];
    const a = peakIdx + 1;
    const b = peakIdx + 2;
    if (pitches[a] >= pk || pitches[b] >= pitches[a]) {
      const barA = phraseNotes[a].bar;
      const barB = phraseNotes[b].bar;
      let p1 = nearestPoolStrictlyBelow(pk, barA, context);
      pitches[a] = p1;
      let p2 = nearestPoolStrictlyBelow(p1, barB, context);
      if (p2 >= p1) p2 = nearestPoolStrictlyBelow(p1, barB, context);
      pitches[b] = p2;
    }
  }

  if (!noteIsInMotifSpan(n - 1, spans)) {
    const bar = phraseNotes[n - 1].bar;
    const prev = pitches[n - 2];
    pitches[n - 1] = nearestPool(cadenceMidi, bar, context);
    if (pitches[n - 1] >= prev) pitches[n - 1] = nearestPoolStrictlyBelow(prev, bar, context);
  }

  // Suffix floor: no interior post-peak pitch below the cadence (so landing ties the tail minimum).
  const land = pitches[n - 1];
  for (let i = peakIdx + 1; i < n - 1; i++) {
    if (noteIsInMotifSpan(i, spans)) continue;
    if (pitches[i] < land) pitches[i] = land;
  }
  // Re-check monotonic non-increase toward cadence after floor raise.
  for (let i = peakIdx + 1; i < n; i++) {
    if (noteIsInMotifSpan(i, spans)) continue;
    const prev = pitches[i - 1];
    const bar = phraseNotes[i].bar;
    if (pitches[i] > prev) pitches[i] = nearestPoolStrictlyBelow(prev, bar, context);
  }

  // De-duplicate non-adjacent global maxima (ambiguous peaks): keep first max index, lower other maxima not adjacent to it.
  for (let guard = 0; guard < 8; guard++) {
    const mx = Math.max(...pitches);
    const ix = pitches.map((p, i) => (p === mx ? i : -1)).filter((i) => i >= 0);
    if (ix.length <= 1) break;
    const f = ix[0];
    let any = false;
    for (const i of ix) {
      if (i === f || i - f <= 1) continue;
      if (!noteIsInMotifSpan(i, spans)) {
        pitches[i] = clampPitch(mx - 1, LOW, HIGH);
        any = true;
      }
    }
    if (!any) break;
  }

  // Strengthen ≥2 upward steps into first global peak (validator: strict rise into peak).
  const pkNow = peakIndex(pitches);
  if (pkNow >= 2 && !noteIsInMotifSpan(pkNow - 2, spans) && !noteIsInMotifSpan(pkNow - 1, spans) && !noteIsInMotifSpan(pkNow, spans)) {
    const p = pkNow;
    if (!(pitches[p - 2] < pitches[p - 1] && pitches[p - 1] < pitches[p])) {
      const bar1 = phraseNotes[p - 1].bar;
      const bar2 = phraseNotes[p - 2].bar;
      let p1 = nearestPoolStrictlyBelow(pitches[p], bar1, context);
      pitches[p - 1] = p1;
      let p0 = nearestPoolStrictlyBelow(p1, bar2, context);
      if (p0 >= p1) p0 = nearestPoolStrictlyBelow(p1, bar2, context);
      pitches[p - 2] = p0;
    }
  }

}

/**
 * Apply phrase-state generation (v2) + cadence weight on final bar; motif spans immutable except phrase-final cadence.
 */
export function applySongModePhraseEngineV1(guitar: PartModel, context: CompositionContext): void {
  if (context.presetId !== 'guitar_bass_duo') return;
  if (context.generationMetadata?.songModeHookFirstIdentity !== true) return;
  if (context.form.totalBars !== TB) return;

  const primary = context.generationMetadata?.songModePrimaryMotif as Motif | undefined;
  const seed = context.seed;
  const mlen = motifCycleLength(primary);
  const segments = songModePhraseSegments();
  let prevSig = '';

  for (let pi = 0; pi < segments.length; pi++) {
    const { startBar, endBar } = segments[pi];
    const phraseNotes = collectPhraseNotes(guitar, startBar, endBar);
    if (phraseNotes.length < 4) continue;

    const n = phraseNotes.length;
    const motifSpans = buildMotifSpans(phraseNotes, mlen);
    const pitches = phraseNotes.map((x) => x.pitch);
    const plan = planPhraseShape(n, seed, pi);
    const cadenceMidi = cadenceTargetLowMidi(endBar, context);

    generatePhraseStatePitches(pitches, motifSpans, phraseNotes, plan.peakIdx, context, seed, pi, cadenceMidi);

    for (let i = 0; i < n; i++) {
      if (noteIsInMotifSpan(i, motifSpans)) continue;
      const ev = phraseNotes[i].measure.events[phraseNotes[i].eventIndex] as { pitch: number };
      ev.pitch = pitches[i];
    }

    const mFirst = guitar.measures.find((x) => x.index === startBar);
    const mLast = guitar.measures.find((x) => x.index === endBar);
    if (mFirst && !noteIsInMotifSpan(0, motifSpans)) shapePhraseOpening(mFirst, pi, context, startBar);
    if (mLast) {
      snapPhraseLandingToChordTone(mLast, context, endBar);
      const cadenceNotes = mLast.events
        .filter((e) => e.kind === 'note')
        .map((e) => e as { duration: number; startBeat: number })
        .sort((a, b) => a.startBeat - b.startBeat);
      const prevCad = cadenceNotes.length >= 2 ? cadenceNotes[cadenceNotes.length - 2].duration : 0.5;
      extendLastNoteCadence(mLast, Math.max(1, prevCad * 1.5));
      emphasizeCadenceDuration(mLast);
    }

    const sig = rhythmDurSignature(guitar, startBar, endBar);
    if (pi > 0 && sig === prevSig && mFirst) {
      const notes = mFirst.events.filter((e) => e.kind === 'note');
      if (notes.length >= 2 && !noteIsInMotifSpan(0, motifSpans) && !noteIsInMotifSpan(1, motifSpans)) {
        const n0 = notes[0] as { duration: number };
        const n1 = notes[1] as { duration: number };
        n0.duration = snapAttackBeatToGrid(n0.duration + 0.25);
        n1.duration = snapAttackBeatToGrid(Math.max(0.25, n1.duration - 0.25));
      }
    }
    prevSig = rhythmDurSignature(guitar, startBar, endBar);

    for (let b = startBar; b <= endBar; b++) {
      const m = guitar.measures.find((x) => x.index === b);
      if (m) normalizeMeasureToEighthBeatGrid(m);
    }
  }
}

function isStrongChordTone(pitch: number, poolMidiArr: number[]): boolean {
  return poolMidiArr.some((p) => Math.abs(p - pitch) <= 1);
}

function minPitchAfterPeak(pitches: number[], peak: number): number {
  if (peak >= pitches.length - 1) return pitches[pitches.length - 1];
  let mn = pitches[peak + 1];
  for (let i = peak + 1; i < pitches.length; i++) mn = Math.min(mn, pitches[i]);
  return mn;
}

function validatePhraseDirectionality(
  guitar: PartModel,
  context: CompositionContext,
  startBar: number,
  endBar: number,
  phraseLabel: string
): string[] {
  const errs: string[] = [];
  const opts = chordToneOpts(context);
  const notes = collectPhraseNotes(guitar, startBar, endBar);
  if (notes.length < 4) {
    errs.push(`Song Mode phrase v1: ${phraseLabel} needs ≥4 notes for directional integrity (has ${notes.length}).`);
    return errs;
  }
  const pitches = notes.map((n) => n.pitch);

  if (!hasDirectionalRunThree(pitches)) {
    errs.push(`Song Mode phrase v1: ${phraseLabel} lacks a run of ≥3 steps in one direction.`);
  }

  if (multiplePeaksAmbiguous(pitches)) {
    errs.push(`Song Mode phrase v1: ${phraseLabel} has ambiguous multiple peaks at max pitch.`);
  }

  const pk = peakIndex(pitches);
  if (!peakPrecededByTwoUps(pitches)) {
    errs.push(`Song Mode phrase v1: ${phraseLabel} peak is not preceded by ≥2 upward steps.`);
  }

  const chord = getChordForBar(endBar, context);
  const gtones = guitarChordTonesInRange(chord, 40, 90, opts);
  const poolMidiArr = [gtones.root, gtones.third, gtones.fifth, gtones.seventh].map((x) => Math.round(x));

  const fallOk =
    hasTwoDownStepsAfterPeak(pitches, pk) ||
    (descentFromPeakToEnd(pitches, pk) && downStepsCountAfterPeak(pitches, pk) >= 1);
  if (!fallOk) {
    errs.push(`Song Mode phrase v1: ${phraseLabel} lacks proper fall after peak (DD or descent to landing).`);
  }

  if (maxBarDirectionChanges(guitar, startBar, endBar) > 3) {
    errs.push(`Song Mode phrase v1: ${phraseLabel} has >3 contour direction changes in a bar (zigzag).`);
  }

  const mLast = guitar.measures.find((x) => x.index === endBar);
  const ev = mLast?.events
    .filter((e) => e.kind === 'note')
    .map((e) => e as { pitch: number; duration: number; startBeat: number })
    .sort((a, b) => a.startBeat - b.startBeat);
  const lastNote = ev?.length ? ev[ev.length - 1] : undefined;
  const prevNote = ev && ev.length >= 2 ? ev[ev.length - 2] : undefined;

  if (!lastNote || !prevNote) {
    errs.push(`Song Mode phrase v1: ${phraseLabel} missing cadence notes on final bar.`);
    return errs;
  }

  if (!isStrongChordTone(lastNote.pitch, poolMidiArr)) {
    errs.push(`Song Mode phrase v1: ${phraseLabel} landing is not a strong chord tone.`);
  }

  const lowAfter = minPitchAfterPeak(pitches, pk);
  if (lastNote.pitch > lowAfter + 1) {
    errs.push(`Song Mode phrase v1: ${phraseLabel} landing is not among lowest points after peak.`);
  }

  if (lastNote.duration < prevNote.duration * 1.5 - 1e-4) {
    errs.push(`Song Mode phrase v1: ${phraseLabel} landing note not ≥1.5× preceding duration.`);
  }

  let hasSpace = false;
  for (const n of notes) {
    if (n.duration >= 1 - 1e-4) hasSpace = true;
  }
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (m?.events.some((e) => e.kind === 'rest')) hasSpace = true;
  }
  if (!hasSpace) {
    errs.push(`Song Mode phrase v1: ${phraseLabel} lacks rest or sustained note (anti-noodle).`);
  }

  return errs;
}

/** Public validation — fail loud for Song Mode guitar. */
export function validateSongModePhraseEngineV1(guitar: PartModel, context: CompositionContext): string[] {
  const errs: string[] = [];
  if (context.presetId !== 'guitar_bass_duo') return errs;
  if (context.generationMetadata?.songModeHookFirstIdentity !== true) return errs;
  if (context.form.totalBars !== TB) return errs;

  const segments = songModePhraseSegments();
  let prevSig = '';

  for (let pi = 0; pi < segments.length; pi++) {
    const { startBar, endBar } = segments[pi];
    const label = `phrase ${pi + 1} (bars ${startBar}–${endBar})`;
    errs.push(...validatePhraseDirectionality(guitar, context, startBar, endBar, label));

    const notes = collectPhraseNotes(guitar, startBar, endBar);
    const sig = rhythmDurSignature(guitar, startBar, endBar);
    if (pi > 0 && sig === prevSig) {
      errs.push(`Song Mode phrase v1: ${label} rhythm matches previous phrase (contrast required).`);
    }
    prevSig = sig;

    let eighthRun = 0;
    let maxRun = 0;
    for (const n of notes) {
      if (Math.abs(n.duration - 0.5) < 0.08) {
        eighthRun++;
        maxRun = Math.max(maxRun, eighthRun);
      } else eighthRun = 0;
    }
    if (maxRun >= 6 && !notes.some((x) => x.duration >= 1)) {
      errs.push(`Song Mode phrase v1: ${label} has continuous 8th motion without space.`);
    }
  }

  return errs;
}
