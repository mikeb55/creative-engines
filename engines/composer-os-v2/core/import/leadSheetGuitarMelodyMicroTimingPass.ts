/**
 * Phase B v2 - guitar voice-1 melody 16th-grid displacement after Phase D chording.
 * Targets clamped 16th onsets directly (no in-pass quantize); final clamp is sole quantizer.
 */

import { BEATS_PER_MEASURE, type NoteEvent, type ScoreModel } from '../score-model/scoreModelTypes';
import { SIXTEENTH_GRID_BEATS } from './leadSheetQuintetSixteenthGridClampPass';

export type LeadSheetGuitarMelodyMicroTimingComposerId = 'bartok' | 'debussy' | 'kenny_wheeler' | 'james_brown';

export interface LeadSheetGuitarMelodyMicroTimingPassInput {
  score: ScoreModel;
  composerId: LeadSheetGuitarMelodyMicroTimingComposerId | string;
  seed?: number;
  /** 0 = calmer micro-timing, 1 = more active; default 0.35 (gentle side). */
  rhythmicActivity?: number;
}

export interface LeadSheetGuitarMelodyMicroTimingPassDiagnostics {
  notesAdjusted: number;
  notesSkippedCollision: number;
  barsTouched: number;
  displacementDensity: number;
  composerId: string;
}

export interface LeadSheetGuitarMelodyMicroTimingPassResult {
  score: ScoreModel;
  diagnostics: LeadSheetGuitarMelodyMicroTimingPassDiagnostics;
}

const DENSITY_BAND: Record<LeadSheetGuitarMelodyMicroTimingComposerId, { min: number; max: number }> = {
  bartok: { min: 0.18, max: 0.28 },
  debussy: { min: 0.12, max: 0.2 },
  kenny_wheeler: { min: 0.16, max: 0.24 },
  james_brown: { min: 0.14, max: 0.22 },
};

function normalizeComposerId(composerId: string): LeadSheetGuitarMelodyMicroTimingComposerId | null {
  if (
    composerId === 'kenny_wheeler' ||
    composerId === 'bartok' ||
    composerId === 'debussy' ||
    composerId === 'james_brown'
  ) {
    return composerId;
  }
  return null;
}

function seededUnit(seed: number, bar: number, slot: number, tag: string): number {
  let h = (seed ^ (bar * 7919)) >>> 0;
  for (let i = 0; i < tag.length; i++) {
    h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  }
  h = (h ^ (slot * 104729)) >>> 0;
  return (h % 10000) / 10000;
}

function grid16(value: number): number {
  return Math.round(value / SIXTEENTH_GRID_BEATS) * SIXTEENTH_GRID_BEATS;
}

function measureBeatSpan(measure: { measureBeatSpanQuarters?: number }): number {
  return measure.measureBeatSpanQuarters ?? BEATS_PER_MEASURE;
}

function guitarV1Notes(measure: { events: readonly { kind: string; voice?: number }[] }): NoteEvent[] {
  return measure.events
    .filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat || a.pitch - b.pitch);
}

function displacementTargets(currentStart: number, beatSpan: number): number[] {
  const snapped = grid16(currentStart);
  const out: number[] = [];
  for (const delta of [-0.25, 0.25]) {
    const target = Math.round((snapped + delta) / SIXTEENTH_GRID_BEATS) * SIXTEENTH_GRID_BEATS;
    if (target < -1e-9) continue;
    if (target > beatSpan - SIXTEENTH_GRID_BEATS + 1e-9) continue;
    if (Math.abs(target - snapped) < 1e-9) continue;
    out.push(target);
  }
  return out;
}

function canPlaceAt(notes: readonly NoteEvent[], idx: number, newStart: number, beatSpan: number): boolean {
  const note = notes[idx]!;
  const end = newStart + note.duration;
  if (newStart < -1e-9 || end > beatSpan + 1e-9) return false;
  if (end - newStart + 1e-9 < SIXTEENTH_GRID_BEATS) return false;
  for (let j = 0; j < notes.length; j++) {
    if (j === idx) continue;
    const other = notes[j]!;
    const otherEnd = other.startBeat + other.duration;
    if (newStart + 1e-9 < otherEnd && end - 1e-9 > other.startBeat) return false;
  }
  return true;
}

function notePriority(
  note: NoteEvent,
  idx: number,
  notes: readonly NoteEvent[],
  bar: number,
  composerId: LeadSheetGuitarMelodyMicroTimingComposerId,
  seed: number,
): number {
  let score = seededUnit(seed, bar, idx, 'prio') * 0.35;
  if (idx === 0) score += 3;
  if (idx === notes.length - 1) score += 3;
  if (note.duration >= 0.5) score += 2;
  if (note.duration >= 1) score += 1;
  const onGrid = grid16(note.startBeat);
  if (Math.abs(note.startBeat - onGrid) < 1e-9) {
    const modHalf = onGrid % 0.5;
    if (modHalf < 1e-9 || Math.abs(modHalf - 0.5) < 1e-9) score += 0.75;
  }
  if (composerId === 'bartok' && bar % 3 === 1) score += 1.5;
  if (composerId === 'debussy' && bar % 4 === 0) score += 1;
  if (composerId === 'kenny_wheeler' && bar % 2 === 1) score += 0.75;
  if (composerId === 'james_brown' && (bar % 2 === 0 || Math.abs((bar - 1) % 4) < 1e-9)) score += 0.85;
  return score;
}

function pickBartokTarget16th(
  currentStart: number,
  beatSpan: number,
  bar: number,
  idx: number,
  noteCount: number,
  seed: number,
): number | null {
  const options = displacementTargets(currentStart, beatSpan);
  if (options.length === 0) return null;

  const snapped = grid16(currentStart);
  const early = options.filter((t) => t < snapped - 1e-9).sort((a, b) => a - b);
  const late = options.filter((t) => t > snapped + 1e-9).sort((a, b) => a - b);

  const modHalf = snapped % 0.5;
  const onStrongBeat = modHalf < 1e-9 || Math.abs(modHalf - 0.5) < 1e-9;
  const onWeakBeat = !onStrongBeat;
  const cellEdge = bar % 3 === 1 || idx === 0 || idx === noteCount - 1;

  // Anticipation-dominant: spiky ahead-of-beat on cell edges and accents.
  if (cellEdge || onStrongBeat) {
    if (early.length > 0) return early[0]!;
    return late[0] ?? null;
  }

  // Weak beat only: occasional late delay for asymmetric mix; default pull early.
  if (onWeakBeat && late.length > 0 && seededUnit(seed, bar, idx, 'bartlate') < 0.22) {
    return late[0]!;
  }
  if (early.length > 0) return early[0]!;
  return late[0] ?? null;
}

function pickTarget16th(
  composerId: LeadSheetGuitarMelodyMicroTimingComposerId,
  currentStart: number,
  beatSpan: number,
  bar: number,
  idx: number,
  noteCount: number,
  seed: number,
): number | null {
  const options = displacementTargets(currentStart, beatSpan);
  if (options.length === 0) return null;

  if (composerId === 'debussy') {
    const later = options.filter((t) => t > grid16(currentStart) + 1e-9);
    if (later.length > 0) return later[later.length - 1]!;
    return options[options.length - 1]!;
  }

  if (composerId === 'kenny_wheeler') {
    const offbeat = options.filter((t) => {
      const mod = t % 0.5;
      return Math.abs(mod - 0.25) < 1e-9;
    });
    if (offbeat.length > 0) {
      const pick = Math.floor(seededUnit(seed, bar, idx, 'ken') * offbeat.length);
      return offbeat[pick]!;
    }
    const pick = Math.floor(seededUnit(seed, bar, idx, 'ken2') * options.length);
    return options[pick]!;
  }

  if (composerId === 'james_brown') {
    const backbeat = options.filter((t) => Math.abs(t - 1) < 1e-9 || Math.abs(t - 3) < 1e-9);
    if (backbeat.length > 0) {
      const pick = Math.floor(seededUnit(seed, bar, idx, 'jb') * backbeat.length);
      return backbeat[pick]!;
    }
    const offbeat = options.filter((t) => {
      const mod = t % 0.5;
      return Math.abs(mod - 0.25) < 1e-9;
    });
    if (offbeat.length > 0) {
      const pick = Math.floor(seededUnit(seed, bar, idx, 'jb2') * offbeat.length);
      return offbeat[pick]!;
    }
  }

  return pickBartokTarget16th(currentStart, beatSpan, bar, idx, noteCount, seed);
}

interface Candidate {
  bar: number;
  idx: number;
  priority: number;
}

export function leadSheetGuitarMelodyPitchOrderKey(score: ScoreModel): string {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  if (!guitar) return '';
  const chunks: string[] = [];
  for (const measure of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    const pitches = guitarV1Notes(measure).map((n) => n.pitch);
    chunks.push(`${measure.index}:${pitches.join(',')}`);
  }
  return chunks.join('|');
}

export function leadSheetGuitarMelodyBarAssignmentKey(score: ScoreModel): string {
  const guitar = score.parts.find((p) => p.id === 'guitar');
  if (!guitar) return '';
  const chunks: string[] = [];
  for (const measure of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    const notes = guitarV1Notes(measure);
    chunks.push(`${measure.index}:${notes.length}:${notes.map((n) => n.pitch).join(',')}`);
  }
  return chunks.join('|');
}

export function leadSheetNonMelodyPartsFingerprint(score: ScoreModel): string {
  const chunks: string[] = [];
  for (const part of score.parts) {
    if (part.id === 'guitar') {
      for (const measure of part.measures) {
        const events = measure.events
          .filter((e) => e.kind === 'note' && (e.voice ?? 1) !== 1)
          .map((e) => {
            if (e.kind !== 'note') return '';
            return `${measure.index}:${e.voice ?? 1}:${e.startBeat.toFixed(3)}:${e.duration.toFixed(3)}:${e.pitch}`;
          })
          .filter(Boolean);
        if (events.length) chunks.push(`guitar-v2+:${events.join(',')}`);
      }
      continue;
    }
    for (const measure of part.measures) {
      const events = measure.events
        .filter((e) => e.kind === 'note')
        .map((e) => {
          if (e.kind !== 'note') return '';
          return `${measure.index}:${e.voice ?? 1}:${e.startBeat.toFixed(3)}:${e.duration.toFixed(3)}:${e.pitch}`;
        })
        .filter(Boolean);
      if (events.length) chunks.push(`${part.id}:${events.join(',')}`);
    }
  }
  return chunks.join('|');
}

export interface GuitarMelodyOnsetMove {
  bar: number;
  oldOnset: number;
  newOnset: number;
  direction: 'EARLY' | 'LATE';
}

export function listGuitarMelodyOnsetMovesVsBaseline(
  baseline: ScoreModel,
  after: ScoreModel,
): GuitarMelodyOnsetMove[] {
  const baseGuitar = baseline.parts.find((p) => p.id === 'guitar');
  const afterGuitar = after.parts.find((p) => p.id === 'guitar');
  if (!baseGuitar || !afterGuitar) return [];
  const moves: GuitarMelodyOnsetMove[] = [];
  for (const measure of [...afterGuitar.measures].sort((a, b) => a.index - b.index)) {
    const beforeNotes = guitarV1Notes(baseGuitar.measures.find((m) => m.index === measure.index) ?? { events: [] });
    const afterNotes = guitarV1Notes(measure);
    for (let i = 0; i < afterNotes.length; i++) {
      const b = beforeNotes[i];
      const a = afterNotes[i]!;
      if (!b || b.pitch !== a.pitch) continue;
      if (Math.abs(b.startBeat - a.startBeat) <= 1e-9) continue;
      moves.push({
        bar: measure.index,
        oldOnset: b.startBeat,
        newOnset: a.startBeat,
        direction: a.startBeat < b.startBeat - 1e-9 ? 'EARLY' : 'LATE',
      });
    }
  }
  return moves;
}

export function countGuitarMelodyOnsetDiffVsBaseline(
  baseline: ScoreModel,
  after: ScoreModel,
): number {
  const baseGuitar = baseline.parts.find((p) => p.id === 'guitar');
  const afterGuitar = after.parts.find((p) => p.id === 'guitar');
  if (!baseGuitar || !afterGuitar) return 0;
  let diff = 0;
  for (const measure of [...afterGuitar.measures].sort((a, b) => a.index - b.index)) {
    const beforeNotes = guitarV1Notes(baseGuitar.measures.find((m) => m.index === measure.index) ?? { events: [] });
    const afterNotes = guitarV1Notes(measure);
    for (let i = 0; i < afterNotes.length; i++) {
      const b = beforeNotes[i];
      const a = afterNotes[i]!;
      if (!b || b.pitch !== a.pitch) continue;
      if (Math.abs(b.startBeat - a.startBeat) > 1e-9) diff += 1;
    }
  }
  return diff;
}

interface BartokMovePlan {
  bar: number;
  idx: number;
  target: number;
  direction: 'EARLY' | 'LATE';
  priority: number;
}

function collectBartokMovePlans(
  guitar: NonNullable<ScoreModel['parts'][number]>,
  seed: number,
): BartokMovePlan[] {
  const plans: BartokMovePlan[] = [];
  for (const measure of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    const notes = guitarV1Notes(measure);
    const beatSpan = measureBeatSpan(measure);
    for (let idx = 0; idx < notes.length; idx++) {
      const note = notes[idx]!;
      const snapped = grid16(note.startBeat);
      const priority = notePriority(note, idx, notes, measure.index, 'bartok', seed);
      const options = displacementTargets(note.startBeat, beatSpan);
      for (const target of options) {
        if (target < snapped - 1e-9) {
          plans.push({
            bar: measure.index,
            idx,
            target,
            direction: 'EARLY',
            priority: priority + 2,
          });
        } else if (target > snapped + 1e-9) {
          const modHalf = snapped % 0.5;
          const onWeakBeat = !(modHalf < 1e-9 || Math.abs(modHalf - 0.5) < 1e-9);
          const onDownbeat = snapped < 1e-9;
          const latePriorityScale = onWeakBeat ? 0.55 : onDownbeat ? 0.18 : 0.28;
          plans.push({
            bar: measure.index,
            idx,
            target,
            direction: 'LATE',
            priority: priority * latePriorityScale,
          });
        }
      }
    }
  }
  return plans;
}

function applyBartokDisplacementPass(
  guitar: NonNullable<ScoreModel['parts'][number]>,
  seed: number,
  densityTarget: number,
  totalMelodyNotes: number,
): LeadSheetGuitarMelodyMicroTimingPassResult['diagnostics'] & { barsTouchedSet: Set<number> } {
  const targetCount = Math.max(1, Math.round(totalMelodyNotes * densityTarget));
  const minLate = 1;
  const maxLate = 2;
  const targetEarly = Math.max(1, targetCount - maxLate);

  const plans = collectBartokMovePlans(guitar, seed);
  const latePlans = [...plans.filter((p) => p.direction === 'LATE')].sort(
    (a, b) => b.priority - a.priority || a.bar - b.bar || a.idx - b.idx,
  );
  const earlyPlans = [...plans.filter((p) => p.direction === 'EARLY')].sort(
    (a, b) => b.priority - a.priority || a.bar - b.bar || a.idx - b.idx,
  );

  const selectedKeys = new Set<string>();
  const displacedInBar = new Map<number, number>();
  const barsTouchedSet = new Set<number>();
  let notesAdjusted = 0;
  let notesSkippedCollision = 0;
  let lateApplied = 0;

  const tryApply = (plan: BartokMovePlan): boolean => {
    const key = `${plan.bar}:${plan.idx}`;
    if (selectedKeys.has(key)) return false;
    if ((displacedInBar.get(plan.bar) ?? 0) >= 2) return false;
    const measure = guitar.measures.find((m) => m.index === plan.bar);
    if (!measure) return false;
    const notes = guitarV1Notes(measure);
    const note = notes[plan.idx];
    if (!note) return false;
    const beatSpan = measureBeatSpan(measure);
    if (!canPlaceAt(notes, plan.idx, plan.target, beatSpan)) return false;
    note.startBeat = plan.target;
    selectedKeys.add(key);
    displacedInBar.set(plan.bar, (displacedInBar.get(plan.bar) ?? 0) + 1);
    barsTouchedSet.add(plan.bar);
    notesAdjusted += 1;
    if (plan.direction === 'LATE') lateApplied += 1;
    return true;
  };

  for (const plan of earlyPlans) {
    if (notesAdjusted >= targetEarly) break;
    if (selectedKeys.has(`${plan.bar}:${plan.idx}`)) continue;
    if (!tryApply(plan)) notesSkippedCollision += 1;
  }

  for (const plan of latePlans) {
    if (lateApplied >= minLate) break;
    if (selectedKeys.has(`${plan.bar}:${plan.idx}`)) continue;
    if (!tryApply(plan)) notesSkippedCollision += 1;
  }

  for (const plan of earlyPlans) {
    if (notesAdjusted >= targetCount) break;
    if (selectedKeys.has(`${plan.bar}:${plan.idx}`)) continue;
    if (!tryApply(plan)) notesSkippedCollision += 1;
  }

  if (lateApplied < minLate) {
    for (const plan of latePlans) {
      if (lateApplied >= minLate) break;
      if (selectedKeys.has(`${plan.bar}:${plan.idx}`)) continue;
      if (!tryApply(plan)) notesSkippedCollision += 1;
    }
  }

  if (notesAdjusted < targetCount && lateApplied < maxLate) {
    for (const plan of latePlans) {
      if (notesAdjusted >= targetCount || lateApplied >= maxLate) break;
      if (selectedKeys.has(`${plan.bar}:${plan.idx}`)) continue;
      if (!tryApply(plan)) notesSkippedCollision += 1;
    }
  }

  for (const plan of earlyPlans) {
    if (notesAdjusted >= targetCount) break;
    if (selectedKeys.has(`${plan.bar}:${plan.idx}`)) continue;
    if (!tryApply(plan)) notesSkippedCollision += 1;
  }

  return {
    notesAdjusted,
    notesSkippedCollision,
    barsTouched: barsTouchedSet.size,
    displacementDensity: totalMelodyNotes > 0 ? notesAdjusted / totalMelodyNotes : 0,
    composerId: 'bartok',
    barsTouchedSet,
  };
}

export function applyLeadSheetGuitarMelodyMicroTimingPass(
  input: LeadSheetGuitarMelodyMicroTimingPassInput,
): LeadSheetGuitarMelodyMicroTimingPassResult {
  const composerId = normalizeComposerId(input.composerId);
  if (!composerId) {
    return {
      score: input.score,
      diagnostics: {
        notesAdjusted: 0,
        notesSkippedCollision: 0,
        barsTouched: 0,
        displacementDensity: 0,
        composerId: input.composerId,
      },
    };
  }

  const seed = input.seed ?? 90106;
  const out = structuredClone(input.score) as ScoreModel;
  const guitar = out.parts.find((p) => p.id === 'guitar');
  if (!guitar) {
    return {
      score: out,
      diagnostics: {
        notesAdjusted: 0,
        notesSkippedCollision: 0,
        barsTouched: 0,
        displacementDensity: 0,
        composerId,
      },
    };
  }

  const band = DENSITY_BAND[composerId];
  const activity = Math.max(0, Math.min(1, input.rhythmicActivity ?? 0.35));
  const activityScale = 0.65 + activity * 0.7;
  const densityTarget =
    (band.min + (band.max - band.min) * seededUnit(seed, 0, 0, 'density')) * activityScale;

  let totalMelodyNotes = 0;
  for (const measure of guitar.measures) {
    totalMelodyNotes += guitarV1Notes(measure).length;
  }

  if (composerId === 'bartok') {
    const bartok = applyBartokDisplacementPass(guitar, seed, densityTarget, totalMelodyNotes);
    return {
      score: out,
      diagnostics: {
        notesAdjusted: bartok.notesAdjusted,
        notesSkippedCollision: bartok.notesSkippedCollision,
        barsTouched: bartok.barsTouched,
        displacementDensity: bartok.displacementDensity,
        composerId: bartok.composerId,
      },
    };
  }

  const candidates: Candidate[] = [];
  for (const measure of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    const notes = guitarV1Notes(measure);
    for (let idx = 0; idx < notes.length; idx++) {
      candidates.push({
        bar: measure.index,
        idx,
        priority: notePriority(notes[idx]!, idx, notes, measure.index, composerId, seed),
      });
    }
  }

  const targetCount = Math.max(1, Math.round(totalMelodyNotes * densityTarget));
  candidates.sort((a, b) => b.priority - a.priority || a.bar - b.bar || a.idx - b.idx);

  const selected = new Set<string>();
  const displacedInBar = new Map<number, number>();
  let notesAdjusted = 0;
  let notesSkippedCollision = 0;
  const barsTouched = new Set<number>();

  for (const cand of candidates) {
    if (selected.size >= targetCount) break;
    const key = `${cand.bar}:${cand.idx}`;
    if (selected.has(key)) continue;

    const perBarCap = 1;
    if ((displacedInBar.get(cand.bar) ?? 0) >= perBarCap) continue;

    const measure = guitar.measures.find((m) => m.index === cand.bar);
    if (!measure) continue;
    const notes = guitarV1Notes(measure);
    const note = notes[cand.idx];
    if (!note) continue;

    const adjacentIdx = [...selected].some((s) => {
      const [barStr, idxStr] = s.split(':');
      return Number(barStr) === cand.bar && Math.abs(Number(idxStr) - cand.idx) === 1;
    });
    if (adjacentIdx) continue;

    const beatSpan = measureBeatSpan(measure);
    const target = pickTarget16th(composerId, note.startBeat, beatSpan, cand.bar, cand.idx, notes.length, seed);
    if (target == null) {
      notesSkippedCollision += 1;
      continue;
    }
    if (!canPlaceAt(notes, cand.idx, target, beatSpan)) {
      notesSkippedCollision += 1;
      continue;
    }

    note.startBeat = target;
    selected.add(key);
    displacedInBar.set(cand.bar, (displacedInBar.get(cand.bar) ?? 0) + 1);
    barsTouched.add(cand.bar);
    notesAdjusted += 1;
  }

  return {
    score: out,
    diagnostics: {
      notesAdjusted,
      notesSkippedCollision,
      barsTouched: barsTouched.size,
      displacementDensity: totalMelodyNotes > 0 ? notesAdjusted / totalMelodyNotes : 0,
      composerId,
    },
  };
}
