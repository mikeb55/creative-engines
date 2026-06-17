/**
 * James Brown funk arc - leadsheet quintet import pass.
 * Adapts duo/song-mode funk overlay for guitar + SQ strings; no CompositionContext.
 * Runs after identity-cell echo; before guitar chording and 16th-grid clamp.
 */

import { seededUnit } from '../goldenPath/guitarBassDuoHarmony';
import { snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';
import {
  BEATS_PER_MEASURE,
  type ChordEvent,
  type MeasureModel,
  type NoteEvent,
  type PartModel,
  type ScoreModel,
} from '../score-model/scoreModelTypes';
import { createRest } from '../score-model/scoreEventBuilder';
import {
  applyJamesBrownFunkBias,
  CONSERVATIVE_TEMPLATES,
  ensureNoteCountUnchanged,
  ensureTotalDurationUnchanged,
  FULL_TEMPLATES,
  type JamesBrownFunkWeights,
  snapshotMeasureNotes,
  type MeasureNoteSnapshot,
} from '../goldenPath/jamesBrownFunkOverlay';

const GRID_16TH = 0.25;

const QUINTET_FUNK_PART_IDS = ['guitar', 'sq_violin_1', 'sq_violin_2', 'sq_viola', 'sq_cello'] as const;

const MOTIF_LANDMARK_BARS = new Set([1, 9, 17, 33]);

type FunkTemplateId = 'bias' | 'anticipation' | 'grooveHole';

interface OverlaySpan {
  barIndex: number;
  startBeat: number;
  endBeat: number;
}

export interface LeadSheetJamesBrownFunkArcDiagnostics {
  partsAffected: string[];
  barsAffected: number[];
  transformsApplied: number;
}

export interface LeadSheetJamesBrownFunkArcInput {
  score: ScoreModel;
  seed: number;
  composerId?: string;
}

export interface LeadSheetJamesBrownFunkArcResult {
  score: ScoreModel;
  diagnostics: LeadSheetJamesBrownFunkArcDiagnostics;
}

const DEFAULT_WEIGHTS: JamesBrownFunkWeights = {
  baseWeight: 0,
  funkStrength: 1,
};

function snap16Beat(value: number): number {
  return Math.round(value / GRID_16TH) * GRID_16TH;
}

function snapDurationFunk(d: number): number {
  const s16 = Math.round(d / GRID_16TH) * GRID_16TH;
  const s8 = Math.round(s16 * 2) / 2;
  return Math.max(0.5, Math.min(BEATS_PER_MEASURE, s8));
}

function rebalanceEventSpanToTarget(measure: MeasureModel, targetSpan: number, beatSpan: number): void {
  let snap = snapshotMeasureNotes(measure);
  let delta = targetSpan - snap.totalEventSpan;
  if (Math.abs(delta) < 1e-3) return;

  const ev = sortedNoteRests(measure);
  if (ev.length === 0) return;

  let endSpan = 0;
  for (const e of ev) endSpan = Math.max(endSpan, e.startBeat + e.duration);

  if (delta > 0) {
    const add = snap16Beat(Math.min(delta, beatSpan - endSpan));
    if (add >= GRID_16TH - 1e-9) measure.events.push(createRest(endSpan, add));
  } else {
    const last = ev[ev.length - 1]!;
    if (last.kind === 'rest') {
      last.duration = Math.max(GRID_16TH, snapAttackBeatToGrid(last.duration + delta));
    }
  }

  snap = snapshotMeasureNotes(measure);
  delta = targetSpan - snap.totalEventSpan;
  if (Math.abs(delta) > 0.02) {
    endSpan = 0;
    for (const e of sortedNoteRests(measure)) endSpan = Math.max(endSpan, e.startBeat + e.duration);
    const add = snap16Beat(Math.min(delta, beatSpan - endSpan));
    if (add >= GRID_16TH) measure.events.push(createRest(endSpan, add));
  }
}

function applyQuintetOverlayConstraints(
  measure: MeasureModel,
  snapshot: MeasureNoteSnapshot,
  apply: (m: MeasureModel) => void,
): void {
  const beatSpan = measureBeatSpan(measure);
  apply(measure);
  rebalanceEventSpanToTarget(measure, snapshot.totalEventSpan, beatSpan);
  const after = snapshotMeasureNotes(measure);
  ensureNoteCountUnchanged(snapshot.noteCount, after.noteCount);
  ensureTotalDurationUnchanged(snapshot.totalEventSpan, after.totalEventSpan);
}

function measureBeatSpan(m: MeasureModel): number {
  return m.measureBeatSpanQuarters ?? BEATS_PER_MEASURE;
}

function measureHasFullSpan(snapshot: MeasureNoteSnapshot, beatSpan: number): boolean {
  return Math.abs(snapshot.totalEventSpan - beatSpan) < 0.02;
}

function isPhraseFinalBar(barIndex: number, measure: MeasureModel): boolean {
  return measure.momentTag === 'cadence' || (barIndex > 0 && barIndex % 4 === 0);
}

function seedHookBar(seed: number): number {
  return 17 + ((seed >>> 0) % 8) * 4;
}

function isHookBar(barIndex: number, seed: number): boolean {
  if (MOTIF_LANDMARK_BARS.has(barIndex)) return true;
  return barIndex === seedHookBar(seed);
}

function selectFunkTemplates(
  measure: MeasureModel,
  barIndex: number,
  seed: number,
  fullBar: boolean,
): readonly FunkTemplateId[] {
  if (!fullBar || isPhraseFinalBar(barIndex, measure) || isHookBar(barIndex, seed)) {
    return CONSERVATIVE_TEMPLATES;
  }
  return FULL_TEMPLATES;
}

function firstChordEventInMeasure(measure: MeasureModel): ChordEvent | undefined {
  for (const e of measure.events) {
    if (e.kind === 'chord') return e as ChordEvent;
  }
  return undefined;
}

function crossesPhraseBoundary(span: OverlaySpan): boolean {
  if ((span.barIndex - 1) % 4 === 0 && span.startBeat < 0.75) return true;
  if (span.barIndex % 4 === 0 && span.endBeat > 3.5) return true;
  if (span.barIndex % 8 === 1 && span.startBeat < 1.0) return true;
  return false;
}

function touchesHookAnchorGuard(span: OverlaySpan, seed: number): boolean {
  return isHookBar(span.barIndex, seed);
}

function isInsideParentChord(span: OverlaySpan, chordEvent: ChordEvent | undefined): boolean {
  if (!chordEvent) return true;
  const c0 = chordEvent.startBeat;
  const c1 = chordEvent.startBeat + chordEvent.duration;
  return span.startBeat >= c0 - 1e-3 && span.endBeat <= c1 + 1e-3;
}

function isProtectedCadenceWindow(span: OverlaySpan, measure: MeasureModel): boolean {
  if (measure.momentTag === 'cadence' || measure.momentTag === 'handoff') return true;
  if (measure.momentTag === 'peak') return true;
  if (span.barIndex % 4 === 0 && span.endBeat > 3.25) return true;
  return false;
}

function commitOverlaySpan(
  span: OverlaySpan,
  seed: number,
  measure: MeasureModel,
  chordEvent: ChordEvent | undefined,
  emit: () => void,
): boolean {
  if (crossesPhraseBoundary(span)) return false;
  if (touchesHookAnchorGuard(span, seed)) return false;
  if (!isInsideParentChord(span, chordEvent)) return false;
  if (isProtectedCadenceWindow(span, measure)) return false;
  emit();
  return true;
}

function sortedNoteRests(
  m: MeasureModel,
): Array<NoteEvent | { kind: 'rest'; startBeat: number; duration: number }> {
  return [...m.events]
    .filter((e) => e.kind === 'note' || e.kind === 'rest')
    .sort((a, b) => a.startBeat - b.startBeat) as Array<
    NoteEvent | { kind: 'rest'; startBeat: number; duration: number }
  >;
}

function balanceSpanAfterShorten(
  measure: MeasureModel,
  note: NoteEvent,
  oldDur: number,
  newDur: number,
  beatSpan: number,
  maxTotalSpan: number,
): void {
  const delta = oldDur - newDur;
  if (delta < 1e-4) return;
  const oldEnd = snapAttackBeatToGrid(note.startBeat + oldDur);
  const newEnd = snapAttackBeatToGrid(note.startBeat + newDur);
  const ev = sortedNoteRests(measure);
  const i = ev.findIndex((e) => e === note);
  if (i < 0) return;
  const next = i + 1 < ev.length ? ev[i + 1] : null;
  if (!next) {
    const restDur = snapAttackBeatToGrid(Math.min(beatSpan, maxTotalSpan) - newEnd);
    if (restDur >= GRID_16TH && newEnd + restDur <= maxTotalSpan + 1e-3) {
      measure.events.push(createRest(newEnd, restDur));
    }
    return;
  }
  if (Math.abs(next.startBeat - oldEnd) > 1e-3) {
    const restDur = snapAttackBeatToGrid(delta);
    if (restDur >= GRID_16TH) {
      measure.events.push(createRest(newEnd, restDur));
    }
    return;
  }
  if (next.kind === 'rest') {
    next.startBeat = newEnd;
    next.duration = snapAttackBeatToGrid(next.duration + delta);
  } else {
    measure.events.push(createRest(newEnd, snapAttackBeatToGrid(next.startBeat - newEnd)));
  }
}

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
  note.duration = snapDurationFunk(note.duration + take);
  next.startBeat = snapAttackBeatToGrid(note.startBeat + note.duration);
  next.duration = Math.max(GRID_16TH, snapAttackBeatToGrid(restEnd - next.startBeat));
}

interface MeasureFunkResult {
  transformsApplied: number;
  barTouched: boolean;
}

function applyJamesBrownFunkToMeasure(
  m: MeasureModel,
  barIndex: number,
  seed: number,
  weights: JamesBrownFunkWeights,
): MeasureFunkResult {
  const beatSpan = measureBeatSpan(m);
  const snap = snapshotMeasureNotes(m);
  const fullBar = measureHasFullSpan(snap, beatSpan);
  const templateSet = selectFunkTemplates(m, barIndex, seed, fullBar);
  const chordEvent = firstChordEventInMeasure(m);
  let salt = 0;
  const rng = () => seededUnit(seed, barIndex, 94200 + salt++);
  let transformsApplied = 0;
  let barTouched = false;

  applyQuintetOverlayConstraints(m, snap, (measure) => {
    const notes = measure.events.filter((e) => e.kind === 'note') as NoteEvent[];
    notes.sort((a, b) => a.startBeat - b.startBeat);
    const barStart = m.index;
    const barEnd = m.index;

    for (const n of notes) {
      const velBefore = n.velocity;
      const artBefore = n.articulation;
      applyJamesBrownFunkBias(n, n.startBeat, barStart, barEnd, weights, rng);
      if (n.velocity !== velBefore || n.articulation !== artBefore) {
        transformsApplied += 1;
        barTouched = true;
      }
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
          const committed = commitOverlaySpan(span, seed, measure, chordEvent, () =>
            extendAnticipationIntoTarget(measure, n, want),
          );
          if (committed) {
            transformsApplied += 1;
            barTouched = true;
          }
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
        const newDur = snapDurationFunk(n.duration - 0.5);
        if (newDur >= oldDur - 1e-4) continue;
        const span: OverlaySpan = {
          barIndex,
          startBeat: n.startBeat,
          endBeat: snapAttackBeatToGrid(n.startBeat + newDur),
        };
        const committed = commitOverlaySpan(span, seed, measure, chordEvent, () => {
          n.duration = newDur;
          balanceSpanAfterShorten(measure, n, oldDur, newDur, beatSpan, snap.totalEventSpan);
        });
        if (committed) {
          transformsApplied += 1;
          barTouched = true;
        }
      }
    }
  });

  return { transformsApplied, barTouched };
}

function partSeedOffset(partId: string): number {
  switch (partId) {
    case 'guitar':
      return 0;
    case 'sq_violin_1':
      return 17;
    case 'sq_violin_2':
      return 34;
    case 'sq_viola':
      return 51;
    case 'sq_cello':
      return 68;
    default:
      return 0;
  }
}

function applyJamesBrownFunkToPart(
  part: PartModel,
  seed: number,
  weights: JamesBrownFunkWeights,
): { transformsApplied: number; barsAffected: number[] } {
  const partSeed = seed + partSeedOffset(part.id);
  const barsAffected: number[] = [];
  let transformsApplied = 0;
  for (const m of part.measures) {
    const result = applyJamesBrownFunkToMeasure(m, m.index, partSeed, weights);
    transformsApplied += result.transformsApplied;
    if (result.barTouched) barsAffected.push(m.index);
  }
  return { transformsApplied, barsAffected };
}

export function applyLeadSheetJamesBrownFunkArcPass(
  input: LeadSheetJamesBrownFunkArcInput,
): LeadSheetJamesBrownFunkArcResult {
  if (input.composerId !== undefined && input.composerId !== 'james_brown') {
    return {
      score: input.score,
      diagnostics: { partsAffected: [], barsAffected: [], transformsApplied: 0 },
    };
  }

  const out = structuredClone(input.score) as ScoreModel;
  const partsAffected: string[] = [];
  const barsAffectedSet = new Set<number>();
  let transformsApplied = 0;

  for (const partId of QUINTET_FUNK_PART_IDS) {
    const part = out.parts.find((p) => p.id === partId);
    if (!part) continue;
    const result = applyJamesBrownFunkToPart(part, input.seed, DEFAULT_WEIGHTS);
    if (result.barsAffected.length > 0) {
      partsAffected.push(partId);
      for (const bar of result.barsAffected) barsAffectedSet.add(bar);
    }
    transformsApplied += result.transformsApplied;
  }

  return {
    score: out,
    diagnostics: {
      partsAffected,
      barsAffected: [...barsAffectedSet].sort((a, b) => a - b),
      transformsApplied,
    },
  };
}
