/**
 * Final quintet timing clamp - snap all note onsets/durations to 16th-note grid (0.25 beat).
 * Runs after Phase A anti-loop + Phase B echo; timing-only on all quintet parts.
 */

import { BEATS_PER_MEASURE, type MeasureModel, type NoteEvent, type ScoreModel } from '../score-model/scoreModelTypes';
import { EXPECTED_QUINTET_PART_IDS } from './runDebussyLeadSheetQuintetProof';

export const SIXTEENTH_GRID_BEATS = 0.25;

export interface LeadSheetQuintetSixteenthGridClampDiagnostics {
  notesQuantized: number;
  collisionAdjustments: number;
  collisionRule: 'same-voice-push-forward-to-16th-grid';
  minDurationAfter: number;
  subSixteenthRemaining: number;
}

export interface LeadSheetQuintetSixteenthGridClampResult {
  score: ScoreModel;
  diagnostics: LeadSheetQuintetSixteenthGridClampDiagnostics;
}

function quantizeSixteenth(value: number): number {
  return Math.round(value / SIXTEENTH_GRID_BEATS) * SIXTEENTH_GRID_BEATS;
}

function quantizeDuration(duration: number): number {
  const snapped = quantizeSixteenth(duration);
  return Math.max(SIXTEENTH_GRID_BEATS, snapped);
}

function measureBeatSpan(m: MeasureModel): number {
  return m.measureBeatSpanQuarters ?? BEATS_PER_MEASURE;
}

function fitQuantizedTiming(
  startBeat: number,
  duration: number,
  beatSpan: number,
): { startBeat: number; duration: number } {
  let start = quantizeSixteenth(startBeat);
  let dur = quantizeDuration(duration);
  start = Math.max(0, Math.min(start, beatSpan - SIXTEENTH_GRID_BEATS));
  dur = Math.max(SIXTEENTH_GRID_BEATS, Math.min(dur, beatSpan - start));
  if (start + dur > beatSpan) {
    dur = quantizeDuration(beatSpan - start);
  }
  if (dur < SIXTEENTH_GRID_BEATS) {
    dur = SIXTEENTH_GRID_BEATS;
    start = Math.max(0, quantizeSixteenth(beatSpan - dur));
  }
  return { startBeat: start, duration: dur };
}

function resolveSameVoiceCollisions(notes: NoteEvent[], beatSpan: number): number {
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat || a.pitch - b.pitch);
  let adjustments = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const prevEnd = prev.startBeat + prev.duration;
    if (cur.startBeat + 1e-9 >= prevEnd) continue;
    adjustments += 1;
    const bumped = fitQuantizedTiming(prevEnd, cur.duration, beatSpan);
    cur.startBeat = bumped.startBeat;
    cur.duration = bumped.duration;
  }
  return adjustments;
}

export function scanQuintetSubSixteenthNotes(score: ScoreModel): {
  minDuration: number;
  subSixteenthCount: number;
} {
  let minDuration = Number.POSITIVE_INFINITY;
  let subSixteenthCount = 0;
  for (const partId of EXPECTED_QUINTET_PART_IDS) {
    const part = score.parts.find((p) => p.id === partId);
    if (!part) continue;
    for (const m of part.measures) {
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        if (e.duration < minDuration) minDuration = e.duration;
        const onsetRemainder = Math.abs(e.startBeat / SIXTEENTH_GRID_BEATS - Math.round(e.startBeat / SIXTEENTH_GRID_BEATS));
        const durRemainder = Math.abs(e.duration / SIXTEENTH_GRID_BEATS - Math.round(e.duration / SIXTEENTH_GRID_BEATS));
        if (e.duration + 1e-9 < SIXTEENTH_GRID_BEATS || onsetRemainder > 1e-6 || durRemainder > 1e-6) {
          subSixteenthCount += 1;
        }
      }
    }
  }
  if (!Number.isFinite(minDuration)) minDuration = 0;
  return { minDuration, subSixteenthCount };
}

export function applyLeadSheetQuintetSixteenthGridClampPass(score: ScoreModel): LeadSheetQuintetSixteenthGridClampResult {
  const out = structuredClone(score) as ScoreModel;
  let notesQuantized = 0;
  let collisionAdjustments = 0;

  for (const partId of EXPECTED_QUINTET_PART_IDS) {
    const part = out.parts.find((p) => p.id === partId);
    if (!part) continue;

    for (const measure of part.measures) {
      const beatSpan = measureBeatSpan(measure);
      const notes = measure.events.filter((e): e is NoteEvent => e.kind === 'note');
      if (notes.length === 0) continue;

      for (const note of notes) {
        const fitted = fitQuantizedTiming(note.startBeat, note.duration, beatSpan);
        if (
          Math.abs(note.startBeat - fitted.startBeat) > 1e-9 ||
          Math.abs(note.duration - fitted.duration) > 1e-9
        ) {
          notesQuantized += 1;
        }
        note.startBeat = fitted.startBeat;
        note.duration = fitted.duration;
      }

      const voiceIds = [...new Set(notes.map((n) => n.voice ?? 1))].sort((a, b) => a - b);
      for (const voice of voiceIds) {
        const voiceNotes = notes.filter((n) => (n.voice ?? 1) === voice);
        collisionAdjustments += resolveSameVoiceCollisions(voiceNotes, beatSpan);
      }

      measure.events = [...measure.events].sort((a, b) => a.startBeat - b.startBeat);
    }
  }

  const scan = scanQuintetSubSixteenthNotes(out);
  return {
    score: out,
    diagnostics: {
      notesQuantized,
      collisionAdjustments,
      collisionRule: 'same-voice-push-forward-to-16th-grid',
      minDurationAfter: scan.minDuration,
      subSixteenthRemaining: scan.subSixteenthCount,
    },
  };
}
