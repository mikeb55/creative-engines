/**
 * Phase C3 — James Brown funk overlay (isolated; opt-in via generationMetadata.songModeJamesBrownFunkOverlay).
 * Strong backbeat (2 & 4), anticipation accents, ghosted weak eighths, groove holes via shorten + rest balance.
 * Does not add/remove notes; deterministic (seededUnit only).
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { ChordEvent, MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { createRest } from '../score-model/scoreEventBuilder';
import { seededUnit } from './guitarBassDuoHarmony';
import { snapAttackBeatToGrid, normalizeMeasureToEighthBeatGrid } from '../score-integrity/duoEighthBeatGrid';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import { isProtectedBar } from '../score-integrity/identityLock';
import { getChordForBar } from '../harmony/harmonyResolution';
import { SONG_MODE_MOTIF_BAR_17, SONG_MODE_MOTIF_BAR_9 } from '../motif/motifEngineTypes';

const GRID_16TH = 0.25;

export const JAMES_BROWN_FUNK_OVERLAY_ID = 'JAMES_BROWN_FUNK' as const;

/** Base selection weights (0 = never auto-selected with C1 pool). */
export const SONG_MODE_OVERLAY_BASE_WEIGHTS: Record<string, number> = {
  [JAMES_BROWN_FUNK_OVERLAY_ID]: 0,
};

/** Soft-profile shape aligned with C1 overlay profiles; not blended with C1 — reserved for future / receipts. */
export const JAMES_BROWN_FUNK_OVERLAY_SOFT_PROFILE = {
  durTighten: 0.22,
  velDelta: 6,
  syncAccent: 0.52,
} as const;

export interface JamesBrownFunkWeights {
  baseWeight: number;
  funkStrength: number;
}

export interface MeasureNoteSnapshot {
  noteCount: number;
  totalEventSpan: number;
}

export function snapshotMeasureNotes(m: MeasureModel): MeasureNoteSnapshot {
  let noteCount = 0;
  let totalEventSpan = 0;
  for (const e of m.events) {
    if (e.kind === 'note') noteCount++;
    if (e.kind === 'note' || e.kind === 'rest') totalEventSpan += (e as { duration: number }).duration;
  }
  return { noteCount, totalEventSpan };
}

export function ensureNoteCountUnchanged(before: number, after: number): void {
  if (before !== after) {
    throw new Error(`James Brown overlay: note count changed ${before} -> ${after}`);
  }
}

export function ensureTotalDurationUnchanged(before: number, after: number): void {
  if (Math.abs(before - after) > 0.02) {
    throw new Error(`James Brown overlay: total event span changed ${before} -> ${after}`);
  }
}

export function ensureBarSafeTimings(m: MeasureModel): void {
  normalizeMeasureToEighthBeatGrid(m);
}

export function applyOverlayConstraints(
  measure: MeasureModel,
  snapshot: MeasureNoteSnapshot,
  apply: (m: MeasureModel) => void
): void {
  apply(measure);
  const after = snapshotMeasureNotes(measure);
  ensureNoteCountUnchanged(snapshot.noteCount, after.noteCount);
  ensureTotalDurationUnchanged(snapshot.totalEventSpan, after.totalEventSpan);
  normalizeMeasureToEighthBeatGrid(measure);
}

function snapDurationDuoFunk(d: number): number {
  const s16 = Math.round(d / GRID_16TH) * GRID_16TH;
  const s8 = Math.round(s16 * 2) / 2;
  return Math.max(0.5, Math.min(BEATS_PER_MEASURE, s8));
}

/** Timing edit window inside one bar (quarter-beat space). */
interface OverlaySpan {
  barIndex: number;
  startBeat: number;
  endBeat: number;
}

type FunkTemplateId = 'bias' | 'anticipation' | 'grooveHole';

/** Full funk rhythm passes (anticipation extend + groove-hole shorten). */
export const FULL_TEMPLATES: readonly FunkTemplateId[] = ['bias', 'anticipation', 'grooveHole'];
/** Phrase-final / hook-adjacent: velocity/articulation only — no span mutations. */
export const CONSERVATIVE_TEMPLATES: readonly FunkTemplateId[] = ['bias'];

function parentChordShape(m: MeasureModel, context: CompositionContext): {
  symbol: string;
  isPhraseFinal: boolean;
  isHookBar: boolean;
} {
  const symbol = (m.chord?.trim() && m.chord) || getChordForBar(m.index, context);
  const isPhraseFinal = m.momentTag === 'cadence' || (m.index > 0 && m.index % 4 === 0);
  const isHookBar =
    isProtectedBar(m.index, context) ||
    m.index === SONG_MODE_MOTIF_BAR_9 ||
    m.index === SONG_MODE_MOTIF_BAR_17;
  return { symbol, isPhraseFinal, isHookBar };
}

function selectFunkTemplates(m: MeasureModel, context: CompositionContext): readonly FunkTemplateId[] {
  const parentChord = parentChordShape(m, context);
  let templateSet: readonly FunkTemplateId[] = FULL_TEMPLATES;
  if (parentChord.isPhraseFinal || parentChord.isHookBar) {
    templateSet = CONSERVATIVE_TEMPLATES;
  }
  return templateSet;
}

function firstChordEventInMeasure(measure: MeasureModel): ChordEvent | undefined {
  for (const e of measure.events) {
    if (e.kind === 'chord') return e as ChordEvent;
  }
  return undefined;
}

/** Phrase / section boundary — uses `form.sections` start bars + 4-bar duo phrase grid. */
function crossesPhraseBoundary(span: OverlaySpan, context: CompositionContext): boolean {
  const sec = context.form?.sections;
  if (sec?.length) {
    const sectionStarts = new Set(sec.map((s) => s.startBar).filter((b) => b > 1));
    if (sectionStarts.has(span.barIndex) && span.startBeat < 1.0) return true;
  }
  if ((span.barIndex - 1) % 4 === 0 && span.startBeat < 0.75) return true;
  if (span.barIndex % 4 === 0 && span.endBeat > 3.5) return true;
  return false;
}

/** Hook statement/return + motif landmark bars — no timing overlay mutations. */
function touchesHookAnchorGuard(span: OverlaySpan, context: CompositionContext): boolean {
  if (isProtectedBar(span.barIndex, context)) return true;
  if (span.barIndex === SONG_MODE_MOTIF_BAR_9 || span.barIndex === SONG_MODE_MOTIF_BAR_17) return true;
  return false;
}

function isInsideParentChord(span: OverlaySpan, chordEvent: ChordEvent | undefined): boolean {
  if (!chordEvent) return true;
  const c0 = chordEvent.startBeat;
  const c1 = chordEvent.startBeat + chordEvent.duration;
  return span.startBeat >= c0 - 1e-3 && span.endBeat <= c1 + 1e-3;
}

/** Cadence-tagged bars + phrase-end timing windows (last beat of phrase-final bar). */
function isProtectedCadenceWindow(span: OverlaySpan, measure: MeasureModel): boolean {
  if (measure.momentTag === 'cadence' || measure.momentTag === 'handoff') return true;
  if (measure.momentTag === 'peak') return true;
  if (span.barIndex % 4 === 0 && span.endBeat > 3.25) return true;
  return false;
}

/**
 * Commit a timing-affecting overlay span only if all structural guards pass.
 * Does not mutate chord symbols or `ChordEvent` payloads — timing-only overlay.
 */
function commitOverlaySpan(
  span: OverlaySpan,
  context: CompositionContext,
  measure: MeasureModel,
  chordEvent: ChordEvent | undefined,
  emit: () => void
): void {
  if (crossesPhraseBoundary(span, context)) return;
  if (touchesHookAnchorGuard(span, context)) return;
  if (!isInsideParentChord(span, chordEvent)) return;
  if (isProtectedCadenceWindow(span, measure)) return;
  emit();
}

/**
 * Per-note James Brown bias (velocity / articulation). posInBar = note start in quarter beats [0,4).
 * Duration shaping is applied in applyJamesBrownFunkToMeasure so rests can stay bar-balanced.
 */
export function applyJamesBrownFunkBias(
  note: NoteEvent,
  posInBar: number,
  barStart: number,
  barEnd: number,
  weights: JamesBrownFunkWeights,
  rng: () => number
): void {
  const s = Math.max(0.15, weights.funkStrength);
  const sb = posInBar;

  const onBeat2 = Math.abs(sb - 1) < 0.04;
  const onBeat4 = Math.abs(sb - 3) < 0.04;
  if (onBeat2 || onBeat4) {
    const base = note.velocity ?? 90;
    note.velocity = Math.min(127, Math.round(base + 16 * s));
    note.articulation = 'accent';
    return;
  }

  const andOf1 = Math.abs(sb - 0.5) < 0.04;
  const andOf3 = Math.abs(sb - 2.5) < 0.04;
  if (andOf1 || andOf3) {
    const base = note.velocity ?? 90;
    note.velocity = Math.min(127, Math.round(base + 10 * s));
    return;
  }

  const ghostSlot = Math.abs(sb - 1.5) < 0.04 || Math.abs(sb - 3.5) < 0.04;
  if (ghostSlot && rng() < 0.5) {
    const base = note.velocity ?? 90;
    note.velocity = Math.max(1, Math.round(base - 12 * s));
    return;
  }

  if (rng() < 0.38) {
    const base = note.velocity ?? 90;
    note.velocity = Math.max(1, Math.round(base - 5 * s));
  }
}

function sortedNoteRests(
  m: MeasureModel
): Array<NoteEvent | { kind: 'rest'; startBeat: number; duration: number }> {
  return [...m.events]
    .filter((e) => e.kind === 'note' || e.kind === 'rest')
    .sort((a, b) => a.startBeat - b.startBeat) as Array<
    NoteEvent | { kind: 'rest'; startBeat: number; duration: number }
  >;
}

/** After shortening a note, preserve total span: widen gap as rest before the next event. */
function balanceSpanAfterShorten(measure: MeasureModel, note: NoteEvent, oldDur: number, newDur: number): void {
  const delta = oldDur - newDur;
  if (delta < 1e-4) return;
  const oldEnd = snapAttackBeatToGrid(note.startBeat + oldDur);
  const newEnd = snapAttackBeatToGrid(note.startBeat + newDur);
  const ev = sortedNoteRests(measure);
  const i = ev.findIndex((e) => e === note);
  if (i < 0) return;
  const next = i + 1 < ev.length ? ev[i + 1] : null;
  if (!next) {
    if (newEnd < BEATS_PER_MEASURE - 1e-4) {
      measure.events.push(createRest(newEnd, snapAttackBeatToGrid(BEATS_PER_MEASURE - newEnd)));
    }
    return;
  }
  if (Math.abs(next.startBeat - oldEnd) > 1e-3) return;
  if (next.kind === 'rest') {
    next.startBeat = newEnd;
    next.duration = snapAttackBeatToGrid(next.duration + delta);
  } else {
    measure.events.push(createRest(newEnd, snapAttackBeatToGrid(next.startBeat - newEnd)));
  }
}

/** Steal duration from following rest to extend anticipation into beat 2 / 4. */
function extendAnticipationIntoTarget(measure: MeasureModel, note: NoteEvent, want: number): void {
  if (want < 1e-4) return;
  const ev = sortedNoteRests(measure);
  const i = ev.findIndex((e) => e === note);
  if (i < 0) return;
  const next = i + 1 < ev.length ? ev[i + 1] : null;
  if (!next || next.kind !== 'rest') return;
  const oldEnd = snapAttackBeatToGrid(note.startBeat + note.duration);
  if (Math.abs(next.startBeat - oldEnd) > 1e-3) return;
  const restEnd = next.startBeat + next.duration;
  const take = Math.min(want, Math.max(0, next.duration - GRID_16TH));
  if (take < 1e-4) return;
  note.duration = snapDurationDuoFunk(note.duration + take);
  next.startBeat = snapAttackBeatToGrid(note.startBeat + note.duration);
  next.duration = Math.max(GRID_16TH, snapAttackBeatToGrid(restEnd - next.startBeat));
}

function applyJamesBrownFunkToMeasure(
  m: MeasureModel,
  barIndex: number,
  seed: number,
  weights: JamesBrownFunkWeights,
  context: CompositionContext
): void {
  const templateSet = selectFunkTemplates(m, context);
  const chordEvent = firstChordEventInMeasure(m);
  const snap = snapshotMeasureNotes(m);
  let salt = 0;
  const rng = () => seededUnit(seed, barIndex, 94200 + salt++);

  applyOverlayConstraints(m, snap, (measure) => {
    const notes = measure.events.filter((e) => e.kind === 'note') as NoteEvent[];
    notes.sort((a, b) => a.startBeat - b.startBeat);
    const barStart = m.index;
    const barEnd = m.index;

    for (const n of notes) {
      applyJamesBrownFunkBias(n, n.startBeat, barStart, barEnd, weights, rng);
    }

    if (templateSet.includes('anticipation')) {
      for (const n of notes) {
        const sb = n.startBeat;
        const andOf1 = Math.abs(sb - 0.5) < 0.04;
        const andOf3 = Math.abs(sb - 2.5) < 0.04;
        if (andOf1 || andOf3) {
          const targetBeat = andOf1 ? 1 : 3;
          const headroom = targetBeat - sb;
          const want = Math.min(GRID_16TH * 2, Math.max(0, headroom - n.duration + 0.02));
          const spanEnd = snapAttackBeatToGrid(n.startBeat + n.duration + want);
          const span: OverlaySpan = { barIndex, startBeat: n.startBeat, endBeat: spanEnd };
          commitOverlaySpan(span, context, measure, chordEvent, () => extendAnticipationIntoTarget(measure, n, want));
        }
      }
    }

    if (templateSet.includes('grooveHole')) {
      for (let gi = 0; gi < notes.length; gi++) {
        const n = notes[gi]!;
        const sb = n.startBeat;
        const onBeat2 = Math.abs(sb - 1) < 0.04;
        const onBeat4 = Math.abs(sb - 3) < 0.04;
        const andOf1 = Math.abs(sb - 0.5) < 0.04;
        const andOf3 = Math.abs(sb - 2.5) < 0.04;
        if (onBeat2 || onBeat4 || andOf1 || andOf3) continue;
        if (seededUnit(seed, barIndex, 94280 + gi) >= 0.38 || n.duration < 1.0 - 1e-3) continue;
        const oldDur = n.duration;
        const newDur = snapDurationDuoFunk(n.duration - 0.5);
        if (newDur >= oldDur - 1e-4) continue;
        const span: OverlaySpan = { barIndex, startBeat: n.startBeat, endBeat: snapAttackBeatToGrid(n.startBeat + newDur) };
        commitOverlaySpan(span, context, measure, chordEvent, () => {
          n.duration = newDur;
          balanceSpanAfterShorten(measure, n, oldDur, newDur);
        });
      }
    }
  });
}

function applyJamesBrownFunkToPart(
  part: PartModel,
  seed: number,
  weights: JamesBrownFunkWeights,
  context: CompositionContext
): void {
  for (const m of part.measures) {
    applyJamesBrownFunkToMeasure(m, m.index, seed, weights, context);
  }
}

export function applyJamesBrownFunkOverlay(score: ScoreModel, context: CompositionContext): void {
  const meta = context.generationMetadata as GenerationMetadata;
  if (meta.songModeJamesBrownFunkOverlay !== true) return;
  if (!isGuitarBassDuoFamily(context.presetId)) return;
  if (context.form.totalBars < 32) return;

  const weights: JamesBrownFunkWeights = {
    baseWeight: SONG_MODE_OVERLAY_BASE_WEIGHTS[JAMES_BROWN_FUNK_OVERLAY_ID] ?? 0,
    funkStrength: 1,
  };

  const guitar = score.parts.find((p) => p.id === 'guitar') as PartModel | undefined;
  const bass = score.parts.find((p) => p.id === 'bass') as PartModel | undefined;
  if (guitar) applyJamesBrownFunkToPart(guitar, context.seed, weights, context);
  if (bass) applyJamesBrownFunkToPart(bass, context.seed + 17, weights, context);

  meta.songModeJamesBrownFunkApplied = true;
  meta.songModeJamesBrownFunkReceiptTag =
    'JAMES_BROWN_FUNK: backbeat 2&4, anticipations, 16th-grid feel, groove holes, ghost notes (opt-in; deterministic)';
}
