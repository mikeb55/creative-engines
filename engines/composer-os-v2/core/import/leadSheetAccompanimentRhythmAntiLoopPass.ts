/**
 * Phase A - accompaniment RhythmAntiLoop post-pass (import-layer only).
 * Runs after Phase 7 string realization; adjusts accompaniment onsets/durations only.
 */

import { BEATS_PER_MEASURE, type MeasureModel, type NoteEvent, type ScoreModel } from '../score-model/scoreModelTypes';
import type { PerBarMelodyOwnership } from './debussyLeadSheetMelodyHandoffPlan';

const PRIMARY_ACCOMP_PARTS = ['sq_violin_2', 'sq_viola'] as const;
const CONDITIONAL_ACCOMP_PARTS = ['sq_violin_1', 'sq_cello'] as const;

const GENTLE_MAX_SHIFT_BEATS = 1 / 12;
const MODERATE_MAX_SHIFT_BEATS = 1 / 6;
const MIN_OFF_GRID_SHIFT = 1 / 24;
const GENTLE_NUDGE_GATE = 0.12;
const GENTLE_TEMPLATE_CYCLE_BARS = 4;
const GENTLE_TEMPLATE_SLOTS = 3;
const MODERATE_TEMPLATE_CYCLE_BARS = 2;

export type LeadSheetRhythmAntiLoopIntensity = 'gentle' | 'moderate';

export type LeadSheetRhythmAntiLoopComposerId = 'debussy' | 'kenny_wheeler' | 'bartok' | 'james_brown' | string;

export interface LeadSheetAccompanimentRhythmAntiLoopInput {
  score: ScoreModel;
  perBarMelodyOwnership: readonly PerBarMelodyOwnership[];
  seed?: number;
  composerId?: LeadSheetRhythmAntiLoopComposerId;
  /** Default gentle — selective micro-nudge on Phase 7 accompaniment (swing target 0.88–0.96). */
  rhythmAntiLoopIntensity?: LeadSheetRhythmAntiLoopIntensity;
}

export interface LeadSheetAccompanimentRhythmAntiLoopDiagnostics {
  barsTouched: number;
  notesAdjusted: number;
  partsTouched: string[];
  intensity: LeadSheetRhythmAntiLoopIntensity;
}

export interface LeadSheetAccompanimentRhythmAntiLoopResult {
  score: ScoreModel;
  diagnostics: LeadSheetAccompanimentRhythmAntiLoopDiagnostics;
}

type RhythmTemplate = readonly (readonly [number, number])[];

const TEMPLATES_3: Record<string, readonly RhythmTemplate[]> = {
  debussy: [
    [[0, 0.375], [0.38, 0.28], [0.7, 0.3]],
    [[0.04, 0.32], [0.42, 0.26], [0.72, 0.28]],
    [[0.02, 0.38], [0.45, 0.22], [0.68, 0.32]],
    [[0.06, 0.3], [0.4, 0.3], [0.75, 0.25]],
  ],
  kenny_wheeler: [
    [[0, 0.25], [0.375, 0.25], [0.625, 0.375]],
    [[0.125, 0.25], [0.5, 0.25], [0.8125, 0.1875]],
    [[0.0625, 0.22], [0.4375, 0.28], [0.75, 0.25]],
    [[0, 0.2], [0.4167, 0.3], [0.7917, 0.2083]],
    [[0.0833, 0.27], [0.5417, 0.23], [0.8333, 0.1667]],
  ],
  bartok: [
    [[0, 0.25], [0.3333, 0.1667], [0.5833, 0.4167]],
    [[0, 0.1667], [0.25, 0.1667], [0.5, 0.3333]],
    [[0.0833, 0.2917], [0.4167, 0.2083], [0.6667, 0.3333]],
    [[0, 0.375], [0.4583, 0.1875], [0.7083, 0.2917]],
    [[0.0417, 0.2083], [0.2917, 0.25], [0.625, 0.375]],
    [[0, 0.2917], [0.375, 0.1667], [0.625, 0.3333]],
  ],
};

const TEMPLATES_2: Record<string, readonly RhythmTemplate[]> = {
  debussy: [
    [[0, 0.48], [0.52, 0.48]],
    [[0.04, 0.46], [0.54, 0.46]],
    [[0.02, 0.5], [0.5, 0.48]],
    [[0.06, 0.44], [0.56, 0.44]],
  ],
  kenny_wheeler: [
    [[0, 0.42], [0.5, 0.5]],
    [[0.125, 0.375], [0.5625, 0.4375]],
    [[0.0625, 0.4], [0.5417, 0.4583]],
    [[0, 0.35], [0.4583, 0.5417]],
  ],
  bartok: [
    [[0, 0.3333], [0.4167, 0.5833]],
    [[0, 0.25], [0.3333, 0.6667]],
    [[0.0833, 0.2917], [0.5, 0.5]],
    [[0, 0.375], [0.4583, 0.5417]],
    [[0.0417, 0.25], [0.375, 0.625]],
  ],
};

const TEMPLATES_1: Record<string, readonly RhythmTemplate[]> = {
  debussy: [[[0.02, 0.96]], [[0.04, 0.92]], [[0, 0.94]], [[0.06, 0.9]]],
  kenny_wheeler: [[[0.125, 0.75]], [[0, 0.8]], [[0.0833, 0.8333]], [[0.0625, 0.875]]],
  bartok: [[[0, 0.6667]], [[0.0833, 0.7083]], [[0, 0.75]], [[0.0417, 0.7917]], [[0, 0.8333]]],
};

function normalizeComposerId(composerId: string): string {
  if (composerId === 'kenny_wheeler' || composerId === 'bartok' || composerId === 'debussy' || composerId === 'james_brown') {
    return composerId;
  }
  return 'debussy';
}

function seededUnit(seed: number, bar: number, partId: string, slot: number, composerId: string): number {
  let h = seed ^ (bar * 7919) ^ (slot * 104729);
  for (let i = 0; i < partId.length; i++) h = (h * 31 + partId.charCodeAt(i)) | 0;
  for (let i = 0; i < composerId.length; i++) h = (h * 37 + composerId.charCodeAt(i)) | 0;
  return ((h >>> 0) % 1000) / 1000;
}

function ownerForBar(ownership: readonly PerBarMelodyOwnership[], bar: number): string {
  return ownership.find((o) => o.bar === bar)?.ownerPartId ?? 'guitar';
}

function accompPartsForBar(ownerPartId: string): readonly string[] {
  const out: string[] = [...PRIMARY_ACCOMP_PARTS];
  for (const pid of CONDITIONAL_ACCOMP_PARTS) {
    if (pid !== ownerPartId) out.push(pid);
  }
  return out;
}

function pickTemplates(composerId: string, noteCount: number): readonly RhythmTemplate[] {
  const key = normalizeComposerId(composerId);
  if (noteCount >= 3) return TEMPLATES_3[key] ?? TEMPLATES_3.debussy!;
  if (noteCount === 2) return TEMPLATES_2[key] ?? TEMPLATES_2.debussy!;
  return TEMPLATES_1[key] ?? TEMPLATES_1.debussy!;
}

function maxShiftBeats(intensity: LeadSheetRhythmAntiLoopIntensity): number {
  return intensity === 'moderate' ? MODERATE_MAX_SHIFT_BEATS : GENTLE_MAX_SHIFT_BEATS;
}

function microShift(
  seed: number,
  bar: number,
  partId: string,
  noteIdx: number,
  composerId: string,
  intensity: LeadSheetRhythmAntiLoopIntensity,
): number {
  const cap = maxShiftBeats(intensity);
  const u = seededUnit(seed, bar, partId, noteIdx + 17, composerId);
  const sign = u < 0.5 ? -1 : 1;
  const mag = MIN_OFF_GRID_SHIFT + (u % 0.5) * (cap - MIN_OFF_GRID_SHIFT);
  let shift = sign * mag;

  const norm = normalizeComposerId(composerId);
  if (norm === 'debussy') {
    if (partId === 'sq_viola') shift += 1 / 12;
    if (partId === 'sq_violin_2') shift -= 1 / 24;
  } else if (norm === 'kenny_wheeler') {
    if (noteIdx % 2 === 1) shift += 1 / 12;
    if (partId === 'sq_viola' && bar % 2 === 0) shift += 1 / 24;
  } else if (norm === 'bartok') {
    shift += (bar % 3) * (1 / 36);
    if (partId === 'sq_violin_2') shift -= 1 / 24;
  }

  return Math.max(-cap, Math.min(cap, shift));
}

function clampNoteTiming(start: number, duration: number, beatSpan: number): { start: number; duration: number } {
  const minDur = 0.25;
  let s = Math.max(0, start);
  let d = Math.max(minDur, duration);
  if (s + d > beatSpan) {
    d = Math.max(minDur, beatSpan - s);
  }
  if (s + d > beatSpan) {
    s = Math.max(0, beatSpan - d);
  }
  return { start: s, duration: d };
}

function applyTemplateToNotes(
  notes: NoteEvent[],
  template: RhythmTemplate,
  beatSpan: number,
  seed: number,
  bar: number,
  partId: string,
  composerId: string,
  intensity: LeadSheetRhythmAntiLoopIntensity,
): NoteEvent[] {
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  const count = Math.min(sorted.length, template.length);
  const out: NoteEvent[] = [];

  for (let i = 0; i < count; i++) {
    const note = sorted[i]!;
    const [startFrac, durFrac] = template[i]!;
    const baseStart = startFrac * beatSpan;
    const baseDur = durFrac * beatSpan;
    const shift = microShift(seed, bar, partId, i, composerId, intensity);
    const { start, duration } = clampNoteTiming(baseStart + shift, baseDur, beatSpan);
    out.push({ ...note, startBeat: start, duration });
  }

  for (let i = count; i < sorted.length; i++) {
    const note = sorted[i]!;
    const shift = microShift(seed, bar, partId, i, composerId, intensity);
    const { start, duration } = clampNoteTiming(note.startBeat + shift, note.duration, beatSpan);
    out.push({ ...note, startBeat: start, duration });
  }

  return out.sort((a, b) => a.startBeat - b.startBeat);
}

function applyGentleNudgeToNotes(
  notes: NoteEvent[],
  beatSpan: number,
  seed: number,
  bar: number,
  partId: string,
  composerId: string,
): NoteEvent[] {
  const templateSlot = Math.floor((bar - 1) / GENTLE_TEMPLATE_CYCLE_BARS) % GENTLE_TEMPLATE_SLOTS;
  return [...notes]
    .sort((a, b) => a.startBeat - b.startBeat)
    .map((note, i) => {
      const gate = seededUnit(seed, bar, partId, i + templateSlot * 11, composerId);
      if (gate > GENTLE_NUDGE_GATE) return note;
      const shift = microShift(seed, bar, partId, i + templateSlot, composerId, 'gentle');
      const { start, duration } = clampNoteTiming(note.startBeat + shift, note.duration, beatSpan);
      return { ...note, startBeat: start, duration };
    });
}

function templateVariantIndex(
  seed: number,
  bar: number,
  partId: string,
  composerId: string,
  intensity: LeadSheetRhythmAntiLoopIntensity,
  templateCount: number,
): number {
  if (intensity === 'gentle') {
    const cycle = Math.floor((bar - 1) / GENTLE_TEMPLATE_CYCLE_BARS) % GENTLE_TEMPLATE_SLOTS;
    return cycle % templateCount;
  }
  const cycle = Math.floor((bar - 1) / MODERATE_TEMPLATE_CYCLE_BARS);
  return (cycle + Math.floor(seededUnit(seed, bar, partId, 0, composerId) * templateCount)) % templateCount;
}

function replaceVoiceOneNotes(measure: MeasureModel, newNotes: NoteEvent[]): void {
  const keep = measure.events.filter((e) => e.kind !== 'note' || (e.voice ?? 1) !== 1);
  measure.events = [...keep, ...newNotes].sort((a, b) => a.startBeat - b.startBeat);
}

function measureBeatSpan(m: MeasureModel): number {
  return m.measureBeatSpanQuarters ?? BEATS_PER_MEASURE;
}

export function applyLeadSheetAccompanimentRhythmAntiLoopPass(
  input: LeadSheetAccompanimentRhythmAntiLoopInput,
): LeadSheetAccompanimentRhythmAntiLoopResult {
  const seed = input.seed ?? 90106;
  const composerId = input.composerId ?? 'debussy';
  const intensity = input.rhythmAntiLoopIntensity ?? 'gentle';
  const score = structuredClone(input.score) as ScoreModel;

  const barsTouchedSet = new Set<number>();
  const partsTouchedSet = new Set<string>();
  let notesAdjusted = 0;

  const maxBar = input.perBarMelodyOwnership.reduce((mx, o) => Math.max(mx, o.bar), 0);

  for (let bar = 1; bar <= maxBar; bar++) {
    const ownerPartId = ownerForBar(input.perBarMelodyOwnership, bar);
    const targetParts = accompPartsForBar(ownerPartId);

    for (const partId of targetParts) {
      if (normalizeComposerId(composerId) === 'james_brown' && partId === 'sq_cello') {
        continue;
      }
      const part = score.parts.find((p) => p.id === partId);
      if (!part) continue;
      const measure = part.measures.find((m) => m.index === bar);
      if (!measure) continue;

      const notes = measure.events.filter(
        (e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1,
      );
      if (notes.length === 0) continue;

      const beatSpan = measureBeatSpan(measure);
      const adjusted =
        intensity === 'gentle'
          ? applyGentleNudgeToNotes(notes, beatSpan, seed, bar, partId, composerId)
          : (() => {
              const templates = pickTemplates(composerId, notes.length);
              const variantIdx = templateVariantIndex(
                seed,
                bar,
                partId,
                composerId,
                intensity,
                templates.length,
              );
              const template = templates[variantIdx]!;
              return applyTemplateToNotes(
                notes,
                template,
                beatSpan,
                seed,
                bar,
                partId,
                composerId,
                intensity,
              );
            })();
      replaceVoiceOneNotes(measure, adjusted);

      barsTouchedSet.add(bar);
      partsTouchedSet.add(partId);
      notesAdjusted += adjusted.length;
    }
  }

  return {
    score,
    diagnostics: {
      barsTouched: barsTouchedSet.size,
      notesAdjusted,
      partsTouched: [...partsTouchedSet].sort(),
      intensity,
    },
  };
}

export function leadSheetAccompanimentRhythmFingerprint(
  score: ScoreModel,
  partId: string,
  bar: number,
): string {
  const part = score.parts.find((p) => p.id === partId);
  const measure = part?.measures.find((m) => m.index === bar);
  if (!measure) return '-';
  return measure.events
    .filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1)
    .map((e) => `${e.startBeat.toFixed(4)}x${e.duration.toFixed(4)}`)
    .sort()
    .join('|');
}
